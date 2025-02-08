import fs from 'fs/promises';
import path from 'path';
import { SessionState } from './types';

/**
 * Read session state from file
 */
export async function readSessionState(
  sessionId: string,
  authFolder: string
): Promise<SessionState | null> {
  try {
    const filePath = path.join(authFolder, `${sessionId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as SessionState;
  } catch {
    return null;
  }
}

/**
 * Write session state to file
 */
export async function writeSessionState(
  sessionId: string,
  authFolder: string,
  state: SessionState
): Promise<void> {
  try {
    await fs.mkdir(authFolder, { recursive: true });
    const filePath = path.join(authFolder, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error(`Failed to write session state for ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Delete session state file
 */
export async function deleteSessionState(
  sessionId: string,
  authFolder: string
): Promise<void> {
  try {
    const filePath = path.join(authFolder, `${sessionId}.json`);
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore error if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Failed to delete session state for ${sessionId}:`, error);
      throw error;
    }
  }
}

/**
 * Clean up session directory
 */
export async function cleanupSessionDir(authFolder: string): Promise<void> {
  try {
    await fs.rm(authFolder, { recursive: true, force: true });
    await fs.mkdir(authFolder, { recursive: true });
  } catch (error) {
    console.error('Failed to cleanup session directory:', error);
    throw error;
  }
}
