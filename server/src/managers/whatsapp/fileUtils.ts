import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { SessionState } from './types';

export async function createDirIfNotExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath, fsConstants.F_OK);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function waitForFileUnlock(filePath: string, retries = 5, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.access(filePath, fsConstants.W_OK);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EBUSY') {
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return true;
      }
      throw error;
    }
  }
  return false;
}

export async function clearDirectory(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      try {
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          // Recursively clear subdirectories
          await clearDirectory(filePath);
          
          // Wait for any file locks to be released
          const unlocked = await waitForFileUnlock(filePath);
          if (unlocked) {
            try {
              await fs.rmdir(filePath);
            } catch (error) {
              console.error(`Failed to remove directory ${filePath}:`, error);
            }
          }
        } else {
          // Wait for any file locks to be released
          const unlocked = await waitForFileUnlock(filePath);
          if (unlocked) {
            try {
              await fs.unlink(filePath);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(`Failed to remove file ${filePath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }

    // Try to remove the directory itself if empty
    try {
      const remaining = await fs.readdir(dirPath);
      if (remaining.length === 0) {
        await fs.rmdir(dirPath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Error removing directory ${dirPath}:`, error);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath, fsConstants.F_OK);
  } catch {
    await createDirIfNotExists(path.dirname(filePath));
    await fs.writeFile(filePath, '');
  }
}

export async function getModifiedTime(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await createDirIfNotExists(path.dirname(filePath));
  
  // Wait for any file locks to be released
  const unlocked = await waitForFileUnlock(filePath);
  if (!unlocked) {
    throw new Error(`File ${filePath} is locked`);
  }
  
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to write to ${filePath}:`, error);
    throw error;
  }
}

export async function readSessionState(sessionId: string, authFolder: string): Promise<SessionState | null> {
  const statePath = path.join(authFolder, `${sessionId}.session-state`);
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeSessionState(sessionId: string, authFolder: string, state: SessionState): Promise<void> {
  const statePath = path.join(authFolder, `${sessionId}.session-state`);
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

export async function deleteSessionState(sessionId: string, authFolder: string): Promise<void> {
  const statePath = path.join(authFolder, `${sessionId}.session-state`);
  try {
    await fs.unlink(statePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function clearBrowserData(sessionId: string, config: { AUTH_FOLDER: string; CACHE_FOLDER: string }): Promise<void> {
  const authPath = path.join(config.AUTH_FOLDER, sessionId);
  const cachePath = path.join(config.CACHE_FOLDER, sessionId);

  console.log(`Clearing data for session ${sessionId}...`);
  
  // Delete session state file first
  await deleteSessionState(sessionId, config.AUTH_FOLDER);

  try {
    // Clear auth directory
    await clearDirectory(authPath);
    console.log(`Cleared auth directory for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to clear auth directory for session ${sessionId}:`, error);
  }

  try {
    // Clear cache directory
    await clearDirectory(cachePath);
    console.log(`Cleared cache directory for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to clear cache directory for session ${sessionId}:`, error);
  }

  // Additional cleanup for potential browser profile data
  try {
    const userDataPath = path.join(config.AUTH_FOLDER, `${sessionId}_browser_data`);
    await clearDirectory(userDataPath);
    console.log(`Cleared browser data for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to clear browser data for session ${sessionId}:`, error);
  }
}
