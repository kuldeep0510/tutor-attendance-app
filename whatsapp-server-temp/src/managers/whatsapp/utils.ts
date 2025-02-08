/**
 * Sleep for the specified duration
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get current timestamp in milliseconds
 */
export const timestamp = () => Date.now();

/**
 * Format error messages
 */
export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
