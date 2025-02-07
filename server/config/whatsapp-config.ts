import { config as loadEnv } from 'dotenv';

loadEnv();

const whatsappConfig = {
  port: process.env.PORT || 3001,
  whatsapp: {
    clientId: process.env.WHATSAPP_CLIENT_ID || 'tutor-attendance-app',
    executablePath: process.env.CHROME_PATH, // If provided in env
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
};

export default whatsappConfig;
