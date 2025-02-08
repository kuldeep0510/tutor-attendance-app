import { Client } from 'whatsapp-web.js';
import { SessionConfig } from './types';
import { sleep } from './utils';
import fs from 'fs/promises';
import path from 'path';

export class WhatsAppClientInitializer {
  constructor(private readonly config: SessionConfig) {}

  async initializeClient(sessionId: string, restore: boolean = true): Promise<Client> {
    console.log(`Initializing WhatsApp client for session ${sessionId} (restore: ${restore})`);
    console.log('Setting up browser for session', sessionId);

    try {
      const sessionPath = path.join(this.config.AUTH_FOLDER, sessionId);
      await fs.mkdir(sessionPath, { recursive: true });

      const client = new Client({
        authStrategy: {
          ...this.config.CLIENT_CONFIG,
          clientId: sessionId,  // Unique ID for each client
          dataPath: sessionPath
        },
        puppeteer: {
          ...this.config.CLIENT_CONFIG.puppeteer,
          userDataDir: sessionPath
        }
      });

      console.log('Launching browser for session', sessionId);
      console.log('Creating WhatsApp client for session', sessionId);

      return client;
    } catch (error) {
      console.error(`Failed to initialize client for ${sessionId}:`, error);
      throw error;
    }
  }

  async waitForQROrInit(client: Client, sessionId: string): Promise<void> {
    console.log('Starting initialization for session', sessionId);

    try {
      await client.initialize();
    } catch (error) {
      console.error(`Failed to initialize WhatsApp for ${sessionId}:`, error);
      await this.cleanup(sessionId, true);
      throw error;
    }
  }

  async cleanup(sessionId: string, force: boolean = false): Promise<void> {
    if (!force) return;

    try {
      const sessionPath = path.join(this.config.AUTH_FOLDER, sessionId);
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (error) {
      // If directory doesn't exist, ignore the error
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Error cleaning up session ${sessionId}:`, error);
        throw error;
      }
    }
  }

  async hasExistingSession(sessionId: string): Promise<boolean> {
    try {
      const sessionPath = path.join(this.config.AUTH_FOLDER, sessionId);
      await fs.access(sessionPath);
      return true;
    } catch {
      return false;
    }
  }
}
