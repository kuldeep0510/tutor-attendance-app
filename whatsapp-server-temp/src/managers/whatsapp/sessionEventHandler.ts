import { Client, Events } from 'whatsapp-web.js';
import { SessionData, SessionConfig } from './types';
import { sleep } from './utils';

export class SessionEventHandler {
  constructor(
    private readonly sessionId: string,
    private readonly session: SessionData,
    private readonly config: SessionConfig,
    private readonly updateSession: (updates: Partial<SessionData>) => Promise<void>,
    private readonly cleanupSession: (sessionId: string, force: boolean) => Promise<void>,
    private readonly reconnectSession: (sessionId: string) => Promise<SessionData>
  ) {}

  setupEvents(client: Client): void {
    // QR code received event
    client.on(Events.QR_RECEIVED, (qr) => {
      console.log('QR Code received for session', this.sessionId);
      this.updateSession({ qr }).catch(console.error);
    });

    // Ready event
    client.on(Events.READY, () => {
      console.log('Client is ready for session', this.sessionId);
      this.updateSession({ 
        isReady: true,
        qr: null,
        isInitializing: false,
        reconnectAttempts: 0
      }).catch(console.error);
    });

    // Authentication failure event
    client.on(Events.AUTHENTICATION_FAILURE, async () => {
      console.log('Authentication failed for session', this.sessionId);
      this.cleanupSession(this.sessionId, true).catch(console.error);
    });

    // Disconnected event
    client.on(Events.DISCONNECTED, async (reason) => {
      console.log(`Client disconnected for session ${this.sessionId}:`, reason);
      
      // Don't attempt to reconnect if we're intentionally cleaning up
      if (this.session.isTerminated) {
        return;
      }

      this.updateSession({ 
        isReady: false,
        reconnectAttempts: (this.session.reconnectAttempts || 0) + 1
      }).catch(console.error);

      // If we've exceeded max reconnect attempts, force cleanup
      if (this.session.reconnectAttempts >= this.config.MAX_RECONNECT_ATTEMPTS) {
        console.log(`Max reconnect attempts reached for session ${this.sessionId}`);
        this.cleanupSession(this.sessionId, true).catch(console.error);
        return;
      }

      // Attempt to reconnect after delay
      await sleep(this.config.RECONNECT_INTERVAL);
      if (!this.session.isTerminated) {
        this.reconnectSession(this.sessionId).catch(console.error);
      }
    });
  }

  cleanup(): void {
    // Mark session as terminated to prevent reconnection attempts
    this.updateSession({ isTerminated: true }).catch(console.error);
  }
}
