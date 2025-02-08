import express from 'express';
import { sessionManager } from '../managers/SessionManager';
import { MessageMedia } from 'whatsapp-web.js';
import { readSessionState } from '../managers/whatsapp/fileUtils';

export const whatsappRouter = express.Router();

whatsappRouter.get('/connect', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default';
    console.log('Connecting WhatsApp for user:', userId);

    // Check if we should restore or create new session
    const shouldRestore = req.headers['x-restore-session'] === 'true';
    const sessionId = sessionManager['generateSessionId'](userId);
    const hasExistingSession = await sessionManager['clientInitializer'].hasExistingSession(sessionId);

    // Don't allow restore if no valid session exists
    if (shouldRestore && !hasExistingSession) {
      console.log('No valid session to restore');
      res.status(400).json({
        status: 'error',
        error: 'No valid session to restore'
      });
      return;
    }

    // Create new session or restore existing one
    const force = req.query.force === 'true' && !shouldRestore;
    console.log(`Creating ${force ? 'new' : 'existing'} session for user ${userId} (restore: ${shouldRestore})`);
    const session = await sessionManager.createSession(userId, force);
    
    res.json({
      status: 'success',
      data: {
        connected: session.isReady,
        qr: session.qr,
        isInitializing: session.isInitializing,
        hasSession: session.hasSession,
        lastUsed: session.lastUsed
      }
    });
  } catch (error) {
    console.error('Error initializing WhatsApp session:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

whatsappRouter.get('/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default';
    const session = await sessionManager.getSession(userId);
    
    const sessionId = sessionManager['generateSessionId'](userId);
    const state = await readSessionState(sessionId, sessionManager['config'].AUTH_FOLDER);
    const hasExistingSession = await sessionManager['clientInitializer'].hasExistingSession(sessionId);

    if (!session) {
      return res.json({
        status: 'success',
        data: {
          isReady: false,
          isInitializing: false,
          qr: null,
          hasSession: hasExistingSession,
          isTerminated: state?.isTerminated || false,
          lastUsed: null
        }
      });
    }

    res.json({
      status: 'success',
      data: {
        isReady: session.isReady,
        isInitializing: session.isInitializing,
        qr: session.qr,
        hasSession: hasExistingSession,
        isTerminated: state?.isTerminated || false,
        lastUsed: session.lastUsed
      }
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

whatsappRouter.post('/send-message', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default';
    const { to, message, pdfData } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: to, message'
      });
    }

    const session = await sessionManager.getSession(userId);
    if (!session?.client) {
      // Try to restore session if exists
      const sessionId = sessionManager['generateSessionId'](userId);
      if (await sessionManager['clientInitializer'].hasExistingSession(sessionId)) {
        const newSession = await sessionManager.createSession(userId, false);
        if (!newSession.isReady) {
          return res.status(404).json({
            status: 'error',
            error: 'Session restore failed'
          });
        }
      } else {
        return res.status(404).json({
          status: 'error',
          error: 'No active session found'
        });
      }
    }

    // Format phone number
    const formattedNumber = to.replace(/\D/g, '');
    const chatId = `${formattedNumber}@c.us`;

    try {
      if (pdfData) {
        // Send message with PDF attachment
        const media = new MessageMedia('application/pdf', pdfData, 'bill.pdf');
        await session!.client!.sendMessage(chatId, media, { caption: message });
      } else {
        // Send text message only
        await session!.client!.sendMessage(chatId, message);
      }
      res.json({ status: 'success' });
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  } catch (error) {
    console.error('Error in send-message route:', error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

whatsappRouter.post('/disconnect', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default';
    console.log('Disconnecting WhatsApp for user:', userId);
    
    await sessionManager.cleanupSession(userId, true);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// New endpoint for health check
whatsappRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
