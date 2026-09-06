// src/services/emailService.js - Production ready
import axios from 'axios';

// In production, use relative path. In development, use local API
const getApiUrl = () => {
  // Production (Vercel) - use relative path
  if (import.meta.env.PROD) {
    return '/api';
  }
  // Development - use environment variable or localhost
  return import.meta.env.VITE_API_URL || '/api';
};

const API_URL = getApiUrl();

export const sendBalanceCheckEmail = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/send-email`, data, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Email API error:', error);
    // Return mock response in development to avoid breaking UI
    if (import.meta.env.DEV) {
      console.log('Development mode - returning mock response');
      return { 
        success: true, 
        message: 'Mock response (development mode)',
        balance: data.amount ? `$${data.amount} USD` : '$50.00 USD'
      };
    }
    throw error;
  }
};