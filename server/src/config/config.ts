// Load dotenv only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const config = {
  port: process.env.PORT || 3001,
  whatsapp: {
    clientId: process.env.WHATSAPP_CLIENT_ID || 'tutor-attendance-app',
    // Use PUPPETEER_EXECUTABLE_PATH from render.yaml
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || '/usr/bin/google-chrome-stable'
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
};

export default config;
