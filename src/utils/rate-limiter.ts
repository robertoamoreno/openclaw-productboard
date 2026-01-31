/**
 * Token Bucket Rate Limiter for ProductBoard API
 */

export interface RateLimiterOptions {
  /** Maximum tokens in the bucket */
  maxTokens: number;
  /** Tokens added per interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillInterval: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  maxTokens: 100, // 100 requests
  refillRate: 100, // Refill completely
  refillInterval: 60 * 1000, // Per minute
};

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly options: RateLimiterOptions;

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.tokens = this.options.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervals = Math.floor(elapsed / this.options.refillInterval);

    if (intervals > 0) {
      this.tokens = Math.min(
        this.options.maxTokens,
        this.tokens + intervals * this.options.refillRate
      );
      this.lastRefill = now - (elapsed % this.options.refillInterval);
    }
  }

  /**
   * Try to acquire a token
   * @returns true if token was acquired, false if rate limited
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Acquire a token, waiting if necessary
   * @returns Promise that resolves when a token is available
   */
  async acquire(): Promise<void> {
    if (this.tryAcquire()) {
      return;
    }

    // Wait until next refill
    const waitTime = this.getWaitTime();
    await this.sleep(waitTime);
    await this.acquire();
  }

  /**
   * Get the time in milliseconds until a token is available
   */
  getWaitTime(): number {
    this.refill();

    if (this.tokens > 0) {
      return 0;
    }

    const elapsed = Date.now() - this.lastRefill;
    return this.options.refillInterval - elapsed;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.options.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Check if rate limited without consuming a token
   */
  isRateLimited(): boolean {
    this.refill();
    return this.tokens <= 0;
  }

  /**
   * Get rate limiter statistics
   */
  stats(): { tokens: number; maxTokens: number; waitTime: number } {
    return {
      tokens: this.getTokens(),
      maxTokens: this.options.maxTokens,
      waitTime: this.getWaitTime(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance for the plugin
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(options?: Partial<RateLimiterOptions>): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(options);
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}
