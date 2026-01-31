/**
 * LRU Cache for ProductBoard API responses
 */

import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Maximum number of items to cache */
  max: number;
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes
  max: 500,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheValue = any;

export class ApiCache {
  private cache: LRUCache<string, CacheValue>;

  constructor(options: Partial<CacheOptions> = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.cache = new LRUCache<string, CacheValue>({
      max: opts.max,
      ttl: opts.ttl,
    });
  }

  /**
   * Generate a cache key from tool name and parameters
   */
  static generateKey(tool: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

    return `${tool}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (ttl !== undefined) {
      this.cache.set(key, value, { ttl });
    } else {
      this.cache.set(key, value);
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; max: number } {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }

  /**
   * Wrap an async function with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }
}

// Singleton instance for the plugin
let cacheInstance: ApiCache | null = null;

export function getCache(options?: Partial<CacheOptions>): ApiCache {
  if (!cacheInstance) {
    cacheInstance = new ApiCache(options);
  }
  return cacheInstance;
}

export function resetCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
  cacheInstance = null;
}
