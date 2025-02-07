import express, { Request, Response } from 'express';
import { Client, LocalAuth, MessageMedia, ClientOptions } from 'whatsapp-web.js';
import { createHash } from 'crypto';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import whatsappConfig from './config/whatsapp-config';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse allowed origins and trim whitespace
const allowedOrigins = whatsappConfig.allowedOrigins.map(origin => origin.trim());

// Configure CORS with additional options
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (origin === undefined || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

interface SessionData {
  client: Client | null;
  qr: string | null;
  isReady: boolean;
  isInitializing: boolean;
  lastActivity: number;
}

// Helper function to generate session ID
const generateSessionId = (req: Request): string => {
  return createHash('md5')
    .update((req.ip || '') + (req.headers['user-agent'] || ''))
    .digest('hex');
};

// Session manager to handle multiple connection attempts
class SessionManager {
  private clients: Map<string, SessionData>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.clients = new Map();
    // Cleanup inactive sessions every 30 minutes
    this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 30 * 60 * 1000);
  }

  getAllSessionIds(): string[] {
    return Array.from(this.clients.keys());
  }

  async createSession(sessionId: string): Promise<SessionData> {
    try {
      // Clean up any existing session
      await this.cleanupSession(sessionId);
      
      // Create new session
      const session: SessionData = {
        client: null,
        qr: null,
        isReady: false,
        isInitializing: true,
        lastActivity: Date.now()
      };

      this.clients.set(sessionId, session);
      return session;
    } catch (error) {
      console.error(`Failed to create session ${sessionId}:`, error);
      throw new Error('Failed to initialize WhatsApp session');
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.clients.get(sessionId);
    if (!session) return;

    console.log(`Starting cleanup for session ${sessionId}`);

    if (session.client) {
      try {
        // Stop any active listeners
        session.client.removeAllListeners();
        // Destroy the client properly
        await session.client.destroy();
        // Add a small delay to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error destroying client for session ${sessionId}:`, error);
      } finally {
        session.client = null;
      }
    }

    // Clean auth files
    try {
      const authPath = path.join(__dirname, '.wwebjs_auth', sessionId);
      const cachePath = path.join(__dirname, '.wwebjs_cache');
      
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      
      // Clean shared cache if no other sessions are using it
      if (fs.existsSync(cachePath) && this.clients.size <= 1) {
        fs.rmSync(cachePath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(`Error cleaning files for session ${sessionId}:`, error);
    }

    // Remove from session map
    this.clients.delete(sessionId);
    console.log(`Cleanup completed for session ${sessionId}`);
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.clients.entries()) {
      // Clean up sessions inactive for more than 4 hours
      if (now - session.lastActivity > 4 * 60 * 60 * 1000) {
        this.cleanupSession(sessionId).catch(console.error);
      }
    }
  }

  getSession(sessionId: string): SessionData | undefined {
    const session = this.clients.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  updateSession(sessionId: string, updates: Partial<SessionData>): void {
    const session = this.getSession(sessionId);
    if (session) {
      Object.assign(session, updates);
      this.clients.set(sessionId, session);
    }
  }
}

const sessions = new SessionManager();

// Initialize WhatsApp client
app.get("/api/connect", async (req: Request, res: Response) => {
  const sessionId = generateSessionId(req);

  try {
    const session = await sessions.createSession(sessionId);
    
    if (session.isReady && session.client) {
      res.json({ connected: true });
      return;
    }

    if (session.isInitializing) {
      res.status(400).json({ error: "Connection already in progress" });
      return;
    }

    console.log("Creating WhatsApp client for session:", sessionId);

    // Create auth with improved multi-device support
    const authStrategy = new LocalAuth({
      clientId: `${whatsappConfig.whatsapp.clientId}-${sessionId}`,
      dataPath: path.join(__dirname, '.wwebjs_auth', sessionId)
    });

    // Latest puppeteer configuration optimized for WhatsApp Web
    const puppeteerOpts = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--disable-notifications'
      ],
      defaultViewport: {
        width: 800,
        height: 600,
        deviceScaleFactor: 1
      },
      timeout: 120000,
      protocolTimeout: 120000,
      ignoreHTTPSErrors: true
    };

    // Latest client configuration with improved connection stability
    const clientConfig: ClientOptions = {
      authStrategy,
      puppeteer: puppeteerOpts,
      takeoverOnConflict: true,
      restartOnAuthFail: true
    };

    // Create and initialize client
    const client = new Client(clientConfig);

    // Enhanced event handling
    client.on("loading_screen", (percent, message) => {
      console.log(`[${sessionId}] Loading: ${percent}% - ${message}`);
    });

    client.on("qr", (qr) => {
      console.log(`[${sessionId}] QR Code received:`, qr.length, "characters");
    });

    client.on("authenticated", () => {
      console.log(`[${sessionId}] WhatsApp authenticated successfully`);
    });

    client.on("auth_failure", (msg) => {
      console.error(`[${sessionId}] Auth failure:`, msg);
    });

    client.on("disconnected", (reason) => {
      console.log(`[${sessionId}] WhatsApp disconnected:`, reason);
    });

    // Update session with client before initialization
    sessions.updateSession(sessionId, { 
      client,
      isInitializing: true 
    });

    let responseHandled = false;

    client.on("qr", (qrCode) => {
      console.log(`[${sessionId}] New QR Code`);
      sessions.updateSession(sessionId, { qr: qrCode });
      if (!responseHandled) {
        res.json({ qr: qrCode });
        responseHandled = true;
      }
    });

    client.on("ready", () => {
      console.log(`[${sessionId}] Client ready`);
      sessions.updateSession(sessionId, { 
        isReady: true, 
        isInitializing: false,
        qr: null
      });
      if (!responseHandled) {
        res.json({ connected: true });
        responseHandled = true;
      }
    });

    client.on("disconnected", async (reason) => {
      console.log(`[${sessionId}] Client disconnected:`, reason);
      await sessions.cleanupSession(sessionId);
    });

    client.on("auth_failure", async (msg) => {
      console.error(`[${sessionId}] Authentication failed:`, msg);
      await sessions.cleanupSession(sessionId);
      if (!responseHandled) {
        res.status(401).json({ error: "Authentication failed" });
        responseHandled = true;
      }
    });

    try {
      console.log(`[${sessionId}] Initializing client...`);
      await client.initialize();
      console.log(`[${sessionId}] Client initialization completed`);
    } catch (error) {
      console.error(`[${sessionId}] Client initialization error:`, error);
      await sessions.cleanupSession(sessionId);
      throw error;
    }

    // Set timeout for initialization
    setTimeout(() => {
      if (!responseHandled) {
        const session = sessions.getSession(sessionId);
        if (session?.qr) {
          res.json({ qr: session.qr });
        } else {
          res.status(408).json({ error: "Connection timeout" });
          sessions.cleanupSession(sessionId);
        }
        responseHandled = true;
      }
    }, 180000); // 3 minute timeout

  } catch (error) {
    console.error("Failed to initialize client:", error);
    await sessions.cleanupSession(sessionId);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to initialize WhatsApp"
      });
    }
  }
});

// Get QR code or connection status
app.get("/api/qr", (req: Request, res: Response) => {
  const sessionId = generateSessionId(req);

  const session = sessions.getSession(sessionId);
  if (!session) {
    res.json({ waiting: true });
    return;
  }

  if (session.qr && !session.isReady) {
    res.json({ qr: session.qr });
  } else if (session.isReady) {
    res.json({ connected: true });
  } else {
    res.json({ waiting: true });
  }
});

// Get connection status
app.get("/api/status", async (req: Request, res: Response) => {
  const sessionId = generateSessionId(req);

  const session = sessions.getSession(sessionId);
  if (!session?.client) {
    return res.json({ connected: false });
  }

  try {
    const state = await session.client.getState();
    const isReady = state === 'CONNECTED';
    sessions.updateSession(sessionId, { isReady });
    res.json({ connected: isReady });
  } catch (error) {
    console.error(`[${sessionId}] Status check error:`, error);
    res.json({ connected: false });
  }
});

// Disconnect WhatsApp
app.post("/api/disconnect", async (req: Request, res: Response) => {
  const sessionId = generateSessionId(req);
  await sessions.cleanupSession(sessionId);
  res.json({ success: true });
});

// Send message
app.post("/api/send-message", async (req: Request, res: Response) => {
  const { to, message, pdfData } = req.body;
  const sessionId = generateSessionId(req);

  const session = sessions.getSession(sessionId);
  if (!session?.client || !session.isReady) {
    return res.status(400).json({ 
      success: false, 
      error: "WhatsApp is not connected" 
    });
  }

  try {
    const number = `91${to.replace(/\D/g, '')}@c.us`;
    
    // Ensure the number exists on WhatsApp
    const numberDetails = await session.client.getNumberId(number);
    if (!numberDetails) {
      return res.status(400).json({
        success: false,
        error: "This number is not registered on WhatsApp"
      });
    }

    await session.client.sendMessage(numberDetails._serialized, message);

    if (pdfData) {
      const media = new MessageMedia(
        'application/pdf',
        pdfData.split(',')[1],
        'bill.pdf'
      );
      await session.client.sendMessage(numberDetails._serialized, media, {
        caption: "Tuition Bill PDF",
        sendMediaAsDocument: true
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(`[${sessionId}] Failed to send message:`, error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send message"
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`WhatsApp server running at http://localhost:${PORT}`);
});

// Handle process termination
const cleanupAllSessions = async () => {
  for (const sessionId of sessions.getAllSessionIds()) {
    await sessions.cleanupSession(sessionId);
  }
  console.log("All sessions cleaned up");
};

process.on('exit', cleanupAllSessions);
process.on('SIGINT', () => {
  cleanupAllSessions().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  cleanupAllSessions().then(() => process.exit(0));
});
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await cleanupAllSessions();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

export default app;
