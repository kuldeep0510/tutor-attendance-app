import config from "@/app/config"

/**
 * Default fetch options for WhatsApp API calls
 */
const defaultOptions: RequestInit = {
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  mode: 'cors',
  credentials: 'include',
  signal: AbortSignal.timeout(60000) // 60 second timeout using AbortSignal
}

// Enhanced retry mechanism for failed requests with better error handling
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialBackoff = 1000
): Promise<Response> {
  let retryCount = 0;
  let backoff = initialBackoff;
  
  while (true) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Don't retry on these status codes
      if (response.status === 401 || response.status === 400 || response.status === 404) {
        return response;
      }
      
      // Success case
      if (response.ok) {
        return response;
      }
      
      // Handle specific error cases
      if (response.status === 429) { // Rate limit
        backoff = Math.min(backoff * 2, 30000); // Max 30s backoff for rate limits
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          backoff = Math.max(backoff, parseInt(retryAfter) * 1000);
        }
      } else if (response.status >= 500) { // Server errors
        backoff = Math.min(backoff * 1.5, 15000); // Max 15s backoff for server errors
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if we should retry
      if (retryCount >= maxRetries) {
        return response;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, backoff));
      retryCount++;
      console.log(`Retrying request (${retryCount}/${maxRetries}) after ${backoff}ms`);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (retryCount >= maxRetries) {
          throw new Error('Request timeout after multiple retries');
        }
      } else if (retryCount >= maxRetries) {
        throw error;
      }
      
      backoff = Math.min(backoff * 1.5, 15000);
      await new Promise(resolve => setTimeout(resolve, backoff));
      retryCount++;
      console.log(`Retrying request (${retryCount}/${maxRetries}) after error: ${error}`);
    }
  }
}

/**
 * Get the base URL for WhatsApp API requests based on environment
 */
function getBaseUrl(): string {
  return '/api/whatsapp';
}

/**
 * Execute a WhatsApp API request with consistent options
 */
async function whatsappRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  console.log('Making WhatsApp request to:', url);
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetchWithRetry(url, finalOptions);
    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || `Server error: ${response.status}`;
      } catch {
        const errorText = await response.text();
        errorMessage = `Server error: ${response.status} ${errorText}`;
      }
      console.error('WhatsApp API error:', {
        status: response.status,
        url,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
    return response;
  } catch (error: unknown) {
    console.error(`WhatsApp API request failed (${endpoint}):`, error);
    const enhancedError = new Error(
      `WhatsApp connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure WhatsApp server is running and try again.`
    );
    throw enhancedError;
  }
}

/**
 * Check WhatsApp connection status
 */
export async function checkWhatsAppStatus(): Promise<{ 
  isConnected: boolean; 
  qr?: string;
  hasSession?: boolean;
  isTerminated?: boolean;
}> {
  try {
    const res = await whatsappRequest('/status');
    const data = await res.json();
    return {
      isConnected: data.status === 'success' && data.data.isReady,
      qr: data.data?.qr,
      hasSession: data.data?.hasSession,
      isTerminated: data.data?.isTerminated
    };
  } catch {
    return { isConnected: false };
  }
}

/**
 * Initialize WhatsApp connection with polling for status
 */
export async function initializeConnection(restore: boolean = false): Promise<{ qr?: string; error?: string; connected?: boolean; hasExistingSession?: boolean }> {
  console.log(`Initializing WhatsApp connection (restore: ${restore})`);
  
  try {
    // First check current status
    const statusRes = await whatsappRequest('/status');
    const statusData = await statusRes.json();

    // Already connected - no need to do anything else
    if (statusData.status === 'success' && statusData.data?.isReady) {
      console.log('WhatsApp already connected');
      return { connected: true, hasExistingSession: true };
    }

    // Determine if we have a valid session
    const hasSession = statusData.data?.hasSession;
    const isTerminated = statusData.data?.isTerminated;
    console.log(`Session exists: ${hasSession}, Terminated: ${isTerminated}`);

    // Check for terminated state or missing session
    if (restore) {
      if (!hasSession) {
        console.log('No session to restore');
        return { error: 'No session to restore' };
      }
      if (isTerminated) {
        console.log('Session is terminated, cannot restore');
        return { error: 'Session is terminated, please scan QR code to reconnect' };
      }
    }

    // Connect with appropriate parameters
    const options: RequestInit = {
      method: 'GET',
      keepalive: true,
    };

    if (restore) {
      console.log('Attempting to restore session...');
      options.headers = { 'X-Restore-Session': 'true' };
    } else {
      console.log('Creating new session...');
      options.headers = {};
    }

    const connectRes = await whatsappRequest('/connect', options);
    
    const data = await connectRes.json();
    
    if (data.status === 'error') {
      throw new Error(data.error);
    }

    if (data.data?.connected) {
      return { connected: true };
    }

    if (data.data?.qr) {
      return { qr: data.data.qr };
    }

    // If no immediate connection or QR, start polling for status
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds with 1-second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusRes = await whatsappRequest('/status');
      const statusData = await statusRes.json();
      
      if (statusData.data?.isReady) {
        return { connected: true };
      }
      
      if (statusData.data?.qr) {
        return { qr: statusData.data.qr };
      }
      
      attempts++;
    }
    
    throw new Error('Connection timeout. Please try again.');
    
  } catch (error) {
    console.error("Connection error:", error);
    const errorMessage = error instanceof Error 
      ? error.message
      : "Failed to initialize WhatsApp";
    return { error: errorMessage };
  }
}

/**
 * Send WhatsApp message with optional PDF attachment
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  pdfData?: string
): Promise<boolean> {
  try {
    const res = await whatsappRequest('/send-message', {
      method: 'POST',
      body: JSON.stringify({ to, message, pdfData }),
      keepalive: true
    });
    const data = await res.json();
    return data.status === 'success';
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Server timeout. Please try again.');
    }
    return false;
  }
}

/**
 * Logout and cleanup WhatsApp session
 */
export async function logoutWhatsApp(): Promise<boolean> {
  try {
    const res = await whatsappRequest('/disconnect', {
      method: 'POST'
    });
    const data = await res.json();
    return data.status === 'success';
  } catch (error) {
    console.error('Error logging out WhatsApp:', error);
    return false;
  }
}

/**
 * Force refresh WhatsApp session
 */
export async function refreshWhatsAppSession(): Promise<{ qr?: string; error?: string; connected?: boolean }> {
  try {
    await logoutWhatsApp(); // First ensure clean logout
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for cleanup
    return initializeConnection(); // Start fresh connection
  } catch (error) {
    console.error('Error refreshing WhatsApp session:', error);
    const errorMessage = error instanceof Error 
      ? error.message
      : "Failed to refresh WhatsApp session";
    return { error: errorMessage };
  }
}

// Alias for compatibility
export const checkConnection = checkWhatsAppStatus;
