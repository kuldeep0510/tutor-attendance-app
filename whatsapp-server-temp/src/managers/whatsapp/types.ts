import { Client } from 'whatsapp-web.js';

export interface SessionData {
  client: Client | null;
  qr: string | null;
  isReady: boolean;
  isInitializing: boolean;
  lastActivity: number;
  reconnectAttempts: number;
  hasSession: boolean;
  lastUsed: number;
  isTerminated: boolean;
}

export interface SessionState {
  isTerminated: boolean;
  lastModified: number;
}

export interface SessionConfig {
  AUTH_FOLDER: string;
  CLIENT_CONFIG: any;
  CLEANUP_INTERVAL: number;
  RECONNECT_INTERVAL: number;
  INACTIVE_TIMEOUT: number;
  MAX_RECONNECT_ATTEMPTS: number;
}

export const DEFAULT_CONFIG: SessionConfig = {
  AUTH_FOLDER: './auth',
  CLIENT_CONFIG: {
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  },
  CLEANUP_INTERVAL: 1800000, // 30 minutes
  RECONNECT_INTERVAL: 10000, // 10 seconds
  INACTIVE_TIMEOUT: 7200000, // 2 hours
  MAX_RECONNECT_ATTEMPTS: 5
};
