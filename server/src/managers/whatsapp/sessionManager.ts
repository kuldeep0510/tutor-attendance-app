import { SessionData, SessionConfig, DEFAULT_CONFIG, SessionState } from './types';
import { WhatsAppClientInitializer } from './clientInitializer';
import { SessionEventHandler } from './sessionEventHandler';
import { sleep } from './utils';
import { readSessionState, writeSessionState, deleteSessionState } from './fileUtils';

export class SessionManager {
  private clients: Map<string, SessionData>;
  private cleanupInterval: NodeJS.Timeout | null;
  private readonly clientInitializer: WhatsAppClientInitializer;
  private readonly eventHandlers: Map<string, SessionEventHandler>;
  private readonly sessions: Map<string, string>;  // Maps userId to sessionId

  constructor(private readonly config: SessionConfig) {
    this.clients = new Map();
    this.cleanupInterval = null;
    this.clientInitializer = new WhatsAppClientInitializer(config);
    this.eventHandlers = new Map();
    this.sessions = new Map();
    this.startCleanupInterval();
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions().catch(console.error);
    }, this.config.CLEANUP_INTERVAL);
  }

  private sessionLocks: Map<string, Promise<void>> = new Map();
  private activeInitializations: Map<string, { promise: Promise<SessionData>; isTerminated: boolean }> = new Map();

  private async acquireLock(sessionId: string): Promise<() => void> {
    while (this.sessionLocks.has(sessionId)) {
      await this.sessionLocks.get(sessionId);
    }
    
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>(resolve => {
      resolveLock = resolve;
    });
    this.sessionLocks.set(sessionId, lockPromise);
    
    return () => {
      this.sessionLocks.delete(sessionId);
      resolveLock();
    };
  }

  private generateSessionId(userId: string): string {
    return `user_${userId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
  }

  private async checkSessionState(sessionId: string): Promise<boolean> {
    const state = await readSessionState(sessionId, this.config.AUTH_FOLDER);
    return state !== null && !state.isTerminated;
  }

  private async waitForInitialization(sessionId: string): Promise<SessionData | null> {
    const activeInit = this.activeInitializations.get(sessionId);
    if (!activeInit) return null;

    try {
      console.log(`Waiting for existing initialization of session ${sessionId}...`);
      return await activeInit.promise;
    } catch (error) {
      console.error(`Error waiting for initialization of ${sessionId}:`, error);
      return null;
    }
  }

  public async createSession(userId: string, force: boolean = false): Promise<SessionData> {
    const sessionId = this.generateSessionId(userId);
    this.sessions.set(userId, sessionId);
    console.log(`Creating session for ${sessionId} (force: ${force})`);
    
    // Check for existing initialization
    const existingInit = this.activeInitializations.get(sessionId);
    if (existingInit && !existingInit.isTerminated) {
      console.log(`Session ${sessionId} is already initializing, waiting...`);
      const result = await this.waitForInitialization(sessionId);
      if (result) return result;
    }
    
    const releaseLock = await this.acquireLock(sessionId);
    
    // Create a new initialization promise
    const initPromise = (async () => {
      try {
        // Clean up any existing session first
        await this.cleanupSession(userId, true);
        await sleep(1000);

        // Check session state
        const isValidSession = await this.checkSessionState(sessionId);
        
        // Initialize session state
        await writeSessionState(sessionId, this.config.AUTH_FOLDER, {
          isTerminated: false,
          lastModified: Date.now()
        });

        console.log(`Initializing new session for ${sessionId}`);
        const client = await this.clientInitializer.initializeClient(sessionId, !force);

        const now = Date.now();
        const session: SessionData = {
          client,
          qr: null,
          isReady: false,
          isInitializing: true,
          lastActivity: now,
          reconnectAttempts: 0,
          hasSession: true,
          lastUsed: now,
          isTerminated: false
        };

        this.clients.set(sessionId, session);

        // Set up event handler
        const eventHandler = new SessionEventHandler(
          sessionId,
          session,
          this.config,
          (data) => this.updateSession(sessionId, data),
          (sid, force) => this.cleanupSession(this.getSessionUserId(sid) || '', force),
          (sid) => this.reconnectSession(sid)
        );

        eventHandler.setupEvents(client);
        this.eventHandlers.set(sessionId, eventHandler);

        console.log(`Starting client initialization for ${sessionId}`);
        await this.clientInitializer.waitForQROrInit(client, sessionId);
        
        session.isInitializing = false;
        if (await client.getState() === 'CONNECTED') {
          session.isReady = true;
        }

        return session;
      } catch (error) {
        console.error(`Failed to initialize client for ${sessionId}:`, error);
        await this.cleanupSession(userId, true);
        throw error;
      } finally {
        this.activeInitializations.delete(sessionId);
        releaseLock();
      }
    })();

    // Store the initialization promise
    this.activeInitializations.set(sessionId, { 
      promise: initPromise,
      isTerminated: false
    });

    return initPromise;
  }

  private async reconnectSession(sessionId: string): Promise<SessionData> {
    console.log(`Attempting to reconnect session ${sessionId}...`);
    const userId = this.getSessionUserId(sessionId);
    if (!userId) {
      throw new Error(`No user found for session ${sessionId}`);
    }
    try {
      // Mark any existing initialization as terminated
      const existingInit = this.activeInitializations.get(sessionId);
      if (existingInit) {
        existingInit.isTerminated = true;
      }

      await this.cleanupSession(userId, true);
      await sleep(1000);
      return await this.createSession(userId, true);
    } catch (error) {
      console.error(`Failed to reconnect session ${sessionId}:`, error);
      throw error;
    }
  }

  private getSessionUserId(sessionId: string): string | undefined {
    for (const [userId, sid] of this.sessions.entries()) {
      if (sid === sessionId) {
        return userId;
      }
    }
    return undefined;
  }

  public async cleanupSession(userId: string, force: boolean = false): Promise<void> {
    const sessionId = this.sessions.get(userId);
    if (!sessionId) {
      return;
    }

    console.log(`Starting cleanup for session ${sessionId} [${force ? 'forced' : 'normal'}]`);

    // Mark any existing initialization as terminated
    const existingInit = this.activeInitializations.get(sessionId);
    if (existingInit) {
      existingInit.isTerminated = true;
    }

    // Mark session as terminated
    await writeSessionState(sessionId, this.config.AUTH_FOLDER, {
      isTerminated: true,
      lastModified: Date.now()
    });
    
    const eventHandler = this.eventHandlers.get(sessionId);
    if (eventHandler) {
      eventHandler.cleanup();
      this.eventHandlers.delete(sessionId);
    }

    const session = this.clients.get(sessionId);
    if (session) {
      if (session.client) {
        try {
          await session.client.destroy();
        } catch (destroyError) {
          console.log(`Graceful destroy failed for ${sessionId}, forcing cleanup`);
        } finally {
          session.client = null;
          session.isReady = false;
          session.isInitializing = false;
          session.qr = null;
          session.isTerminated = true;
        }
      }
      this.clients.delete(sessionId);
    }

    this.sessions.delete(userId);

    if (force) {
      try {
        await this.clientInitializer.cleanup(sessionId, true);
        await deleteSessionState(sessionId, this.config.AUTH_FOLDER);
        this.activeInitializations.delete(sessionId);
      } catch (error) {
        console.error(`Error during session cleanup for ${sessionId}:`, error);
        throw error;
      }
    }
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    for (const [sessionId, session] of this.clients.entries()) {
      if (now - session.lastActivity > this.config.INACTIVE_TIMEOUT) {
        const userId = this.getSessionUserId(sessionId);
        if (userId) {
          await this.cleanupSession(userId).catch(console.error);
        }
      }
    }
  }

  public async getSession(userId: string): Promise<SessionData | undefined> {
    const sessionId = this.sessions.get(userId);
    if (!sessionId) {
      return undefined;
    }

    const session = this.clients.get(sessionId);
    if (session) {
      const isValid = await this.checkSessionState(sessionId);
      if (!isValid) {
        await this.cleanupSession(userId, true);
        return undefined;
      }
      session.lastActivity = Date.now();
      this.clients.set(sessionId, session);
    }
    return session;
  }

  private async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const session = this.clients.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastActivity = Date.now();
      this.clients.set(sessionId, session);
    }
  }

  public async shutdown(): Promise<void> {
    console.log('Starting session manager shutdown...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Mark all initializations as terminated
    for (const init of this.activeInitializations.values()) {
      init.isTerminated = true;
    }

    for (const [sessionId, handler] of this.eventHandlers.entries()) {
      handler.cleanup();
      this.eventHandlers.delete(sessionId);
    }

    // Clean up all sessions
    for (const userId of this.sessions.keys()) {
      await this.cleanupSession(userId, true).catch(console.error);
      await sleep(1000);
    }

    this.activeInitializations.clear();
    console.log('Session manager shutdown complete');
  }
}

export const sessionManager = new SessionManager(DEFAULT_CONFIG);

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Cleaning up sessions...');
  await sessionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Cleaning up sessions...');
  await sessionManager.shutdown();
  process.exit(0);
});
