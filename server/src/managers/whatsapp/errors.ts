export enum WhatsAppErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  INVALID_SESSION = 'INVALID_SESSION',
  AUTH_FAILED = 'AUTH_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_PHONE = 'INVALID_PHONE',
  SEND_MESSAGE_FAILED = 'SEND_MESSAGE_FAILED',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public readonly code: WhatsAppErrorCode,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export function isWhatsAppError(error: any): error is WhatsAppError {
  return error instanceof WhatsAppError;
}

export function formatError(error: Error): string {
  if (isWhatsAppError(error)) {
    return `${error.code}: ${error.message}`;
  }
  return error.message;
}
