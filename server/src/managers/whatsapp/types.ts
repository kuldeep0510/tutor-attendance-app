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
  CACHE_FOLDER: string;
  HEADLESS: boolean;
  QR_TIMEOUT: number;
  INIT_TIMEOUT: number;
  CLEANUP_INTERVAL: number;
  INACTIVE_TIMEOUT: number;
  MAX_RETRIES: number;
  RETRY_DELAY: number;
  MAX_RECONNECT_ATTEMPTS: number;
  ENSURE_BROWSER_CLOSE: boolean; // New option to ensure browser closes properly
  BROWSER_LAUNCH_TIMEOUT: number; // New timeout for browser launch
  CLIENT_INIT_DELAY: number; // New delay between cleanup and initialization
}

export const DEFAULT_CONFIG: SessionConfig = {
  AUTH_FOLDER: './.wwebjs_auth',
  CACHE_FOLDER: './.wwebjs_cache',
  HEADLESS: true, // Run browser in headless mode since we display QR in app UI
  QR_TIMEOUT: 90000,     // Reduced to 1.5 minutes for faster feedback
  INIT_TIMEOUT: 180000,  // Reduced to 3 minutes
  CLEANUP_INTERVAL: 3600000, // 1 hour
  INACTIVE_TIMEOUT: 7200000, // 2 hours
  MAX_RETRIES: 5, // Increased retries
  RETRY_DELAY: 3000, // Reduced retry delay for faster recovery
  MAX_RECONNECT_ATTEMPTS: 5, // Increased reconnect attempts
  ENSURE_BROWSER_CLOSE: true, // New option
  BROWSER_LAUNCH_TIMEOUT: 30000, // 30 seconds
  CLIENT_INIT_DELAY: 2000 // 2 seconds delay between cleanup and new initialization
};

// Event handler callbacks
export type SessionUpdateCallback = (update: Partial<SessionData>) => void;
export type CleanupCallback = (sessionId: string, force: boolean) => Promise<void>;
export type ReconnectCallback = (sessionId: string) => Promise<SessionData>;
