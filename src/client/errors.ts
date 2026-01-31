/**
 * ProductBoard API Error Handling
 */

export class ProductBoardError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProductBoardError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class AuthenticationError extends ProductBoardError {
  constructor(message = 'Invalid or expired API token') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ProductBoardError {
  constructor(message = 'Insufficient permissions for this operation') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ProductBoardError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ProductBoardError {
  public readonly retryAfter: number;

  constructor(retryAfter = 60) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends ProductBoardError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ServerError extends ProductBoardError {
  constructor(message = 'ProductBoard server error') {
    super(message, 'SERVER_ERROR', 500);
    this.name = 'ServerError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  if (error instanceof ServerError) {
    return true;
  }
  if (error instanceof ProductBoardError) {
    return error.statusCode >= 500;
  }
  return false;
}

/**
 * Get retry delay for an error
 */
export function getRetryDelay(error: unknown, attempt: number): number {
  if (error instanceof RateLimitError) {
    return error.retryAfter * 1000;
  }
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

/**
 * Parse API error response into appropriate error class
 */
export function parseApiError(
  statusCode: number,
  responseData?: { code?: string; message?: string; details?: Record<string, unknown> },
  retryAfterHeader?: string
): ProductBoardError {
  const message = responseData?.message || 'Unknown error';
  const details = responseData?.details;

  switch (statusCode) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new ProductBoardError(message, 'NOT_FOUND', 404, details);
    case 429:
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
      return new RateLimitError(retryAfter);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message);
    default:
      return new ProductBoardError(message, responseData?.code || 'UNKNOWN_ERROR', statusCode, details);
  }
}
