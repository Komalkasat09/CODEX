// API configuration
export const API_CONFIG = {
  // Base URL for API requests
  BASE_URL: 'http://localhost:8081',
  
  // Endpoint paths
  ENDPOINTS: {
    // Sign language
    SIGN_TO_TEXT: '/api/sign-to-text',
    SIGN_TO_TEXT_PREDICT: '/api/sign-to-text/predict',
    SIGN_TO_TEXT_LEGACY: '/predict',
    
    // Speech/transcription
    TRANSCRIBE: '/api/transcribe',
    TRANSCRIPTS: '/api/transcripts',
    TRANSCRIPT: '/api/transcript',
    ASK: '/api/ask',
    
    // Call endpoints
    MAKE_CALL: '/api/make-call',
    SEND_MESSAGE: '/api/send-message',
    END_CALL: '/api/end-call',
    CALL_STATUS: '/api/call-status',
    
    // Emergency
    SEND_WHATSAPP_EMERGENCY: '/api/send-whatsapp-emergency',
    
    // Text processing
    AUTOCORRECT: '/autocorrect',
    
    // Testing
    TEST_UPLOAD: '/api/test-upload'
  },
  
  // WebSocket base URL (derived from BASE_URL)
  WS_BASE_URL: 'ws://localhost:8081',
  
  // Feature flags
  FEATURES: {
    SIMULATE_CALLS: true
  }
};

// Get full URL for an endpoint
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Get WebSocket URL with path
export function getWsUrl(path: string): string {
  return `${API_CONFIG.WS_BASE_URL}${path}`;
}

// Export default for easier imports
export default API_CONFIG; 