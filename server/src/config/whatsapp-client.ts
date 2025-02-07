import path from 'path';
import fs from 'fs';
import { Client, LocalAuth, ClientOptions } from 'whatsapp-web.js';

export function createWhatsAppClient(sessionId: string) {
    try {
        // Directory for session data
        const SESSION_PATH = path.join(process.cwd(), '.wwebjs_auth', sessionId);

        // Ensure session directory exists
        if (!fs.existsSync(SESSION_PATH)) {
            fs.mkdirSync(SESSION_PATH, { recursive: true });
            console.log(`[${sessionId}] Created new session directory`);
        }

        // Configure Puppeteer options
        const chromiumArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--window-size=1280,720',
            '--disable-notifications',
            '--disable-extensions',
            '--disable-infobars',
            '--disable-features=site-per-process',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors'
        ];

        const puppeteerOptions: ClientOptions['puppeteer'] = {
            headless: true,
            args: chromiumArgs,
            defaultViewport: null,
            userDataDir: SESSION_PATH,
            timeout: 120000,
            dumpio: process.env.WHATSAPP_DEBUG === 'true',
            waitForInitialPage: true,
            ignoreHTTPSErrors: true,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
        };

        // Configure authentication strategy
        const authStrategy = new LocalAuth({
            clientId: `tutor-app-${sessionId}`,
            dataPath: SESSION_PATH
        });

        // Create WhatsApp client
        const client = new Client({
            authStrategy,
            puppeteer: puppeteerOptions,
            webVersionCache: {
                type: 'local',
                path: path.join(process.cwd(), '.wwebjs_cache')
            },
            qrMaxRetries: 5,
            takeoverTimeoutMs: 180000,
            takeoverOnConflict: true,
            restartOnAuthFail: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Event handlers
        client.on('loading_screen', (percent, message) => {
            console.log(`[${sessionId}] Loading: ${percent}% - ${message}`);
        });

        client.on('change_state', state => {
            console.log(`[${sessionId}] Client state changed to: ${state}`);
        });

        client.on('qr', () => {
            console.log(`[${sessionId}] QR Code received. Waiting for scan...`);
        });

        client.on('ready', () => {
            console.log(`[${sessionId}] Client is ready`);
        });

        client.on('authenticated', () => {
            console.log(`[${sessionId}] Client authenticated successfully`);
        });

        client.on('auth_failure', error => {
            console.error(`[${sessionId}] Authentication failed:`, error);
        });

        client.on('disconnected', async (reason) => {
            console.log(`[${sessionId}] Client disconnected: ${reason}`);
            console.log(`[${sessionId}] Attempting to reconnect in 5 seconds...`);
            setTimeout(async () => {
                try {
                    await client.destroy();
                    const { client: newClient } = createWhatsAppClient(sessionId);
                    newClient.initialize();
                } catch (error) {
                    console.error(`[${sessionId}] Reconnect failed:`, error);
                }
            }, 5000);
        });

        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 3;

        client.on('connection.failed', async (error) => {
            console.error(`[${sessionId}] Connection failed:`, error);
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`[${sessionId}] Attempting to reinitialize (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(async () => {
                    try {
                        await client.destroy();
                        const { client: newClient } = createWhatsAppClient(sessionId);
                        newClient.initialize();
                    } catch (error) {
                        console.error(`[${sessionId}] Reinitialize failed:`, error);
                    }
                }, 5000 * reconnectAttempts);
            } else {
                console.error(`[${sessionId}] Max reconnection attempts reached`);
            }
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error(`[${sessionId}] Unhandled Promise Rejection:`, reason);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error(`[${sessionId}] Uncaught Exception:`, error);
        });

        // Handle process termination signals
        process.on('SIGINT', async () => {
            console.log(`[${sessionId}] Received SIGINT, cleaning up...`);
            try {
                await client.destroy();
                console.log(`[${sessionId}] Client destroyed successfully`);
            } catch (error) {
                console.error(`[${sessionId}] Error destroying client:`, error);
            } finally {
                process.exit(0);
            }
        });

        return { client };
    } catch (error) {
        console.error('Error creating WhatsApp client:', error);
        throw error;
    }
}