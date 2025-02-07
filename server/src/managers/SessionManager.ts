import { SessionConfig } from '../managers/whatsapp/types';
import { sessionManager } from './whatsapp/sessionManager';

export class SessionManager {
  constructor(private readonly config: Partial<SessionConfig> = {}) {}

  async start(): Promise<void> {
    // Initialization can be added here if needed
  }

  async stop(): Promise<void> {
    await sessionManager.shutdown();
  }
}

export { sessionManager };
export const globalSessionManager = new SessionManager();
