import { Client } from 'whatsapp-web.js';

export interface WhatsAppSession {
  client: Client | null;
  qr: string | null;
  isReady: boolean;
  isInitializing: boolean;
  lastActivity: number;
}

export interface NumberId {
  _serialized: string;
  server: string;
  user: string;
}

export interface WhatsAppConfig {
  client: Client;
  sessionId: string;
}

export interface MessageOptions {
  caption?: string;
  sendMediaAsDocument?: boolean;
}
