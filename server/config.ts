// Server configuration
const config = {
  port: process.env.PORT || 3001,
  
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  },

  // WhatsApp client configuration
  whatsapp: {
    clientId: process.env.WHATSAPP_CLIENT_ID || 'tutor-app',
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,720',
      '--disable-extensions',
      '--ignore-certificate-errors'
    ],
    puppeteerTimeout: 60000
  }
}

export default config
