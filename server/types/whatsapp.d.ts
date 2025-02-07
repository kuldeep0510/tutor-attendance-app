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
