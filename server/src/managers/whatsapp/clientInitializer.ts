import { Client, LocalAuth } from 'whatsapp-web.js';
import path from 'path';
import { SessionConfig } from './types';
import { createDirIfNotExists, clearDirectory, clearBrowserData, readSessionState } from './fileUtils';
import { Browser, LaunchOptions } from 'puppeteer';
import puppeteer from 'puppeteer';

type PuppeteerOptions = LaunchOptions & {
  userDataDir?: string;
  defaultViewport?: null | {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };
};

export class WhatsAppClientInitializer {
  constructor(private readonly config: SessionConfig) {}

  public async hasExistingSession(sessionId: string): Promise<boolean> {
    try {
      const authPath = path.join(this.config.AUTH_FOLDER, sessionId);
      const userDataDir = path.join(this.config.AUTH_FOLDER, `${sessionId}_browser_data`);
      
      // Check if both auth directory and browser data exist
      const fs = await import('fs/promises');
      const [authExists, browserExists] = await Promise.all([
        fs.access(authPath).then(() => true).catch(() => false),
        fs.access(userDataDir).then(() => true).catch(() => false)
      ]);

      // Check session state
      const state = await readSessionState(sessionId, this.config.AUTH_FOLDER);
      const isValidState = state !== null && !state.isTerminated;

      return authExists && browserExists && isValidState;
    } catch (error) {
      console.error(`Error checking session existence for ${sessionId}:`, error);
      return false;
    }
  }

  private async setupDirectories(sessionId: string): Promise<void> {
    await createDirIfNotExists(this.config.AUTH_FOLDER);
    await createDirIfNotExists(this.config.CACHE_FOLDER);
    const sessionAuthPath = path.join(this.config.AUTH_FOLDER, sessionId);
    const sessionCachePath = path.join(this.config.CACHE_FOLDER, sessionId);
    await createDirIfNotExists(sessionAuthPath);
    await createDirIfNotExists(sessionCachePath);
  }

  private async clearSessionData(sessionId: string, force: boolean = false): Promise<void> {
    if (force) {
      await clearBrowserData(sessionId, {
        AUTH_FOLDER: this.config.AUTH_FOLDER,
        CACHE_FOLDER: this.config.CACHE_FOLDER
      });
    }
  }

  private async setupPuppeteer(sessionId: string): Promise<Browser> {
    const chromeExecutablePath = process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome';

    const userDataDir = path.join(this.config.AUTH_FOLDER, `${sessionId}_browser_data`);
    await createDirIfNotExists(userDataDir);

    try {
      console.log(`Launching browser for session ${sessionId}`);
      const options: PuppeteerOptions = {
        executablePath: chromeExecutablePath,
        userDataDir,
        headless: this.config.HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,720',
          '--disable-notifications',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disable-web-security',
          '--allow-running-insecure-content',
          `--user-data-dir=${userDataDir}`
        ],
        defaultViewport: null,
        timeout: this.config.BROWSER_LAUNCH_TIMEOUT
      };

      const browser = await puppeteer.launch(options);

      // Test browser is working
      const page = await browser.newPage();
      await page.close();

      return browser;
    } catch (error) {
      console.error(`Failed to launch browser for session ${sessionId}:`, error);
      throw error;
    }
  }

  public async initializeClient(sessionId: string, restore: boolean = false): Promise<Client> {
    // Check if session is terminated before initializing
    const state = await readSessionState(sessionId, this.config.AUTH_FOLDER);
    if (state?.isTerminated && restore) {
      console.log(`Session ${sessionId} is terminated, cannot restore`);
      throw new Error('Session is terminated');
    }

    console.log(`Initializing WhatsApp client for session ${sessionId} (restore: ${restore})`);
    await this.setupDirectories(sessionId);
    
    if (!restore) {
      // Only clear session data if we're not restoring
      console.log(`Clearing existing session data for ${sessionId}`);
      await this.clearSessionData(sessionId, true);
    }
    
    await new Promise(resolve => setTimeout(resolve, this.config.CLIENT_INIT_DELAY));

    const authPath = path.join(this.config.AUTH_FOLDER, sessionId);
    const cachePath = path.join(this.config.CACHE_FOLDER, sessionId);
    
    try {
      console.log(`Setting up browser for session ${sessionId}`);
      const browser = await this.setupPuppeteer(sessionId);

      console.log(`Creating WhatsApp client for session ${sessionId}`);
      const client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: sessionId, 
          dataPath: authPath 
        }),
        puppeteer: {
          // Provide the browser instance directly
          browserWSEndpoint: browser.wsEndpoint(),
          // Let the setupPuppeteer function handle these settings
          executablePath: undefined,
          args: undefined,
          headless: undefined
        },
        webVersionCache: {
          type: 'local',
          path: cachePath
        }
      });

      return client;
    } catch (error) {
      console.error(`Error initializing client for ${sessionId}:`, error);
      // Clean up any partial initialization
      await this.clearSessionData(sessionId, true);
      throw error;
    }
  }

  public async waitForQROrInit(client: Client, sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      let qrReceived = false;
      
      const cleanup = () => {
        clearTimeout(qrTimeout);
        clearTimeout(initTimeout);
        client.removeAllListeners('qr');
        client.removeAllListeners('ready');
        client.removeAllListeners('auth_failure');
        
        // If we're cleaning up due to an error and ensuring browser closure is enabled,
        // try to close any browser instances
        if (!isResolved && this.config.ENSURE_BROWSER_CLOSE) {
          if (client.pupPage) {
            client.pupPage.browser().close().catch(console.error);
          }
        }
      };

      const handleSuccess = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve();
        }
      };

      const handleError = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };

      const qrTimeout = setTimeout(() => {
        if (!qrReceived) {
          handleError(new Error('QR timeout - No QR code received. Please ensure Chrome is installed and accessible.'));
        }
      }, this.config.QR_TIMEOUT);

      const initTimeout = setTimeout(() => {
        handleError(new Error('Initialization timeout'));
      }, this.config.INIT_TIMEOUT);

      client.on('qr', () => {
        console.log(`QR Code received for session ${sessionId}`);
        qrReceived = true;
      });

      client.once('ready', () => {
        console.log(`Client ready for session ${sessionId}`);
        handleSuccess();
      });

      client.once('auth_failure', () => {
        console.log(`Auth failure for session ${sessionId}`);
        handleError(new Error('Authentication failed'));
      });

      try {
        console.log(`Starting initialization for session ${sessionId}`);
        client.initialize().catch((error) => {
          console.error(`Error during initialization for session ${sessionId}:`, error);
          handleError(error);
        });
      } catch (error) {
        console.error(`Failed to start initialization for session ${sessionId}:`, error);
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  public async cleanup(sessionId: string, force: boolean = false): Promise<void> {
    try {
      console.log(`Cleaning up session ${sessionId} (force: ${force})`);
      await this.clearSessionData(sessionId, force);
    } catch (error) {
      console.error(`Error during cleanup for session ${sessionId}:`, error);
      throw error;
    }
  }
}
