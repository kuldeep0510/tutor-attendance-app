import { Client } from 'whatsapp-web.js';
import { SessionData, SessionConfig } from './types';
import { WhatsAppError, WhatsAppErrorCode } from './errors';

export class SessionEventHandler {
  private boundEvents: Map<string, (...args: any[]) => void>;
  private qrReceived: boolean = false;
  private initTimeoutId: NodeJS.Timeout | null = null;
  private qrTimeoutId: NodeJS.Timeout | null = null;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private browserClosed: boolean = false;

  constructor(
    private readonly sessionId: string,
    private session: SessionData,
    private readonly config: SessionConfig,
    private readonly onSessionUpdate: (update: Partial<SessionData>) => void,
    private readonly onCleanup: (sessionId: string, force: boolean) => Promise<void>,
    private readonly onReconnect: (sessionId: string) => Promise<SessionData>
  ) {
    this.boundEvents = new Map();
  }

  public setupEvents(client: Client): void {
    // Bind event handlers with proper context
    const qrHandler = this.handleQR.bind(this);
    const readyHandler = this.handleReady.bind(this);
    const authenticatedHandler = this.handleAuthenticated.bind(this);
    const authFailureHandler = this.handleAuthFailure.bind(this);
    const disconnectedHandler = this.handleDisconnected.bind(this);
    const loadingScreenHandler = this.handleLoadingScreen.bind(this);
    const clientErrorHandler = this.handleClientError.bind(this);

    // Store bound handlers for cleanup
    this.boundEvents.set('qr', qrHandler);
    this.boundEvents.set('ready', readyHandler);
    this.boundEvents.set('authenticated', authenticatedHandler);
    this.boundEvents.set('auth_failure', authFailureHandler);
    this.boundEvents.set('disconnected', disconnectedHandler);
    this.boundEvents.set('loading_screen', loadingScreenHandler);
    this.boundEvents.set('change_state', this.handleStateChange.bind(this));
    this.boundEvents.set('change_battery', this.handleBatteryChange.bind(this));

    // Attach event listeners
    client.on('qr', qrHandler);
    client.on('ready', readyHandler);
    client.on('authenticated', authenticatedHandler);
    client.on('auth_failure', authFailureHandler);
    client.on('disconnected', disconnectedHandler);
    client.on('loading_screen', loadingScreenHandler);
    client.on('change_state', this.boundEvents.get('change_state')!);
    client.on('change_battery', this.boundEvents.get('change_battery')!);

    // Handle browser-specific events if available
    if (client.pupPage) {
      client.pupPage.on('error', clientErrorHandler);
      client.pupPage.on('close', () => {
        this.browserClosed = true;
        this.handleDisconnected('Browser closed');
      });
    }

    // Set initialization timeout
    this.initTimeoutId = setTimeout(() => {
      if (!this.session.isReady && !this.qrReceived) {
        console.error(`Session ${this.sessionId} initialization timed out`);
        this.handleTimeout();
      }
    }, this.config.INIT_TIMEOUT);
  }

  private async handleTimeout(): Promise<void> {
    console.log(`Session ${this.sessionId} timed out, attempting cleanup and reconnect`);
    await this.onCleanup(this.sessionId, true);
    
    if (this.session.reconnectAttempts < this.config.MAX_RECONNECT_ATTEMPTS) {
      await this.attemptReconnect();
    } else {
      this.onSessionUpdate({
        isReady: false,
        isInitializing: false,
        qr: null,
      });
    }
  }

  private handleQR(qr: string): void {
    console.log(`QR Code received for session ${this.sessionId}`);
    this.qrReceived = true;

    // Clear any existing timeouts
    this.clearTimeouts();

    this.onSessionUpdate({
      qr,
      isInitializing: true,
      isReady: false,
    });

    // Set new QR code timeout
    this.qrTimeoutId = setTimeout(() => {
      if (this.qrReceived && !this.session.isReady) {
        console.log(`QR Code scan timeout for session ${this.sessionId}`);
        this.handleTimeout();
      }
    }, this.config.QR_TIMEOUT);
  }

  private handleLoadingScreen(percent: number, message: string): void {
    console.log(`Loading screen update for session ${this.sessionId}: ${percent}% - ${message}`);
    this.onSessionUpdate({
      qr: null,
      isInitializing: true,
      isReady: false,
    });
  }

  private handleStateChange(state: string): void {
    console.log(`State changed for session ${this.sessionId}: ${state}`);
    if (state === 'CONNECTED') {
      this.onSessionUpdate({
        isReady: true,
        isInitializing: false,
      });
    } else if (state === 'DISCONNECTED') {
      this.handleDisconnected(`State changed to ${state}`);
    }
  }

  private handleBatteryChange(batteryInfo: { battery: number; plugged: boolean }): void {
    console.log(`Battery status for session ${this.sessionId}: ${batteryInfo.battery}% ${batteryInfo.plugged ? '(Charging)' : ''}`);
  }

  private handleClientError(error: Error): void {
    console.error(`Client error for session ${this.sessionId}:`, error);
    if (this.browserClosed) {
      this.handleDisconnected('Browser closed due to error');
    }
  }

  private handleReady(): void {
    console.log(`Session ${this.sessionId} is ready`);
    this.clearTimeouts();
    this.browserClosed = false;
    this.qrReceived = false;

    this.onSessionUpdate({
      isReady: true,
      isInitializing: false,
      qr: null,
      reconnectAttempts: 0,
    });
  }

  private handleAuthenticated(): void {
    console.log(`Session ${this.sessionId} authenticated successfully`);
    this.qrReceived = false;
    this.onSessionUpdate({
      isInitializing: true,
      qr: null,
    });
  }

  private async handleAuthFailure(): Promise<void> {
    console.error(`Authentication failed for session ${this.sessionId}`);
    
    this.clearTimeouts();
    
    const error = new WhatsAppError(
      'WhatsApp authentication failed',
      WhatsAppErrorCode.AUTH_FAILED
    );

    await this.onCleanup(this.sessionId, true);
    this.qrReceived = false;
    
    this.onSessionUpdate({
      isReady: false,
      isInitializing: false,
      qr: null,
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    const attempt = this.session.reconnectAttempts + 1;
    const delay = Math.min(this.config.RETRY_DELAY * attempt, 15000); // Max 15 second delay

    this.reconnectTimeoutId = setTimeout(async () => {
      console.log(`Attempting to reconnect session ${this.sessionId}. Attempt ${attempt}/${this.config.MAX_RECONNECT_ATTEMPTS}`);
      
      this.onSessionUpdate({
        reconnectAttempts: attempt,
        isInitializing: true,
      });
      
      try {
        const newSession = await this.onReconnect(this.sessionId);
        this.session = newSession;
      } catch (error) {
        console.error(`Failed to reconnect session ${this.sessionId}:`, error);
        if (attempt < this.config.MAX_RECONNECT_ATTEMPTS) {
          await this.attemptReconnect();
        } else {
          this.onSessionUpdate({
            isReady: false,
            isInitializing: false,
            qr: null,
          });
        }
      }
    }, delay);
  }

  private async handleDisconnected(reason: string): Promise<void> {
    console.log(`Session ${this.sessionId} disconnected. Reason:`, reason);
    
    this.onSessionUpdate({
      isReady: false,
      isInitializing: true,
      qr: null,
    });

    if (this.session.reconnectAttempts < this.config.MAX_RECONNECT_ATTEMPTS) {
      await this.attemptReconnect();
    } else {
      console.log(`Max reconnection attempts reached for session ${this.sessionId}`);
      await this.onCleanup(this.sessionId, true);
    }
  }

  private clearTimeouts(): void {
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
    if (this.qrTimeoutId) {
      clearTimeout(this.qrTimeoutId);
      this.qrTimeoutId = null;
    }
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  public cleanup(): void {
    console.log(`Cleaning up event handlers for session ${this.sessionId}`);
    
    this.clearTimeouts();
    
    if (this.session.client) {
      // Remove all event listeners
      for (const [event, handler] of this.boundEvents.entries()) {
        this.session.client.off(event, handler);
      }

      // Clean up page-specific events if they exist
      if (this.session.client.pupPage) {
        this.session.client.pupPage.removeAllListeners();
      }
    }

    this.boundEvents.clear();
    this.qrReceived = false;
    this.browserClosed = false;
  }
}
