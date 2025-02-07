import express from 'express';
import cors from 'cors';
import { whatsappRouter } from './routes/whatsapp';
import { sessionManager } from './managers/SessionManager';

const app = express();
const port = process.env.PORT || 3001;

// Configure middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Routes
app.use('/whatsapp', whatsappRouter);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down...');
  await sessionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  await sessionManager.shutdown();
  process.exit(0);
});
