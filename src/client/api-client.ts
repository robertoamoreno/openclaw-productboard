/**
 * ProductBoard API Client
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  Feature,
  Product,
  Component,
  Note,
  User,
  CurrentUser,
  SearchResult,
  PaginatedResponse,
  CreateFeatureParams,
  UpdateFeatureParams,
  ListFeaturesParams,
  ListProductsParams,
  CreateNoteParams,
  ListNotesParams,
  ListUsersParams,
  SearchParams,
  PluginConfig,
  ProductHierarchy,
} from './types.js';
import {
  parseApiError,
  isRetryableError,
  getRetryDelay,
  ProductBoardError,
} from './errors.js';
import { ApiCache, getCache } from '../utils/cache.js';
import { RateLimiter, getRateLimiter } from '../utils/rate-limiter.js';

const DEFAULT_BASE_URL = 'https://api.productboard.com';
const MAX_RETRIES = 3;

export class ProductBoardClient {
  private client: AxiosInstance;
  private cache: ApiCache;
  private rateLimiter: RateLimiter;
  private baseUrl: string;

  constructor(config: PluginConfig) {
    this.baseUrl = config.apiBaseUrl || DEFAULT_BASE_URL;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'X-Version': '1',
      },
      timeout: 30000,
    });

    this.cache = getCache({
      ttl: (config.cacheTtlSeconds || 300) * 1000,
    });

    this.rateLimiter = getRateLimiter({
      maxTokens: config.rateLimitPerMinute || 100,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const { status, data, headers } = error.response;
          throw parseApiError(
            status,
            data as { code?: string; message?: string; details?: Record<string, unknown> },
            headers['retry-after'] as string | undefined
          );
        }
        throw new ProductBoardError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          0
        );
      }
    );
  }

  /**
   * Execute a request with retry logic and rate limiting
   */
  private async request<T>(
    config: AxiosRequestConfig,
    retryCount = 0
  ): Promise<T> {
    await this.rateLimiter.acquire();

    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (isRetryableError(error) && retryCount < MAX_RETRIES) {
        const delay = getRetryDelay(error, retryCount);
        await this.sleep(delay);
        return this.request<T>(config, retryCount + 1);
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Paginate through all results
   */
  private async paginate<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    maxItems?: number
  ): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | undefined;
    const limit = Math.min(params.limit as number || 100, 100);

    do {
      const response = await this.request<PaginatedResponse<T>>({
        method: 'GET',
        url: endpoint,
        params: { ...params, limit, pageCursor: cursor },
      });

      results.push(...response.data);

      if (maxItems && results.length >= maxItems) {
        return results.slice(0, maxItems);
      }

      cursor = response.links?.next
        ? new URL(response.links.next).searchParams.get('pageCursor') || undefined
        : undefined;
    } while (cursor);

    return results;
  }

  // ============================================
  // Feature Methods
  // ============================================

  async createFeature(params: CreateFeatureParams): Promise<Feature> {
    const result = await this.request<{ data: Feature }>({
      method: 'POST',
      url: '/features',
      data: { data: params },
    });

    // Invalidate feature list caches
    this.cache.invalidatePattern('pb_feature_list:');
    this.cache.invalidatePattern('pb_feature_search:');

    return result.data;
  }

  async listFeatures(params: ListFeaturesParams = {}): Promise<Feature[]> {
    const cacheKey = ApiCache.generateKey('pb_feature_list', params as Record<string, unknown>);

    return this.cache.wrap(cacheKey, async () => {
      const queryParams: Record<string, unknown> = {};

      if (params.productId) queryParams['product.id'] = params.productId;
      if (params.componentId) queryParams['component.id'] = params.componentId;
      if (params.status) queryParams.status = params.status;
      if (params.ownerId) queryParams['owner.id'] = params.ownerId;

      return this.paginate<Feature>('/features', queryParams, params.limit);
    });
  }

  async getFeature(id: string): Promise<Feature> {
    const cacheKey = ApiCache.generateKey('pb_feature_get', { id });

    return this.cache.wrap(cacheKey, async () => {
      const result = await this.request<{ data: Feature }>({
        method: 'GET',
        url: `/features/${id}`,
      });
      return result.data;
    });
  }

  async updateFeature(id: string, params: UpdateFeatureParams): Promise<Feature> {
    const result = await this.request<{ data: Feature }>({
      method: 'PATCH',
      url: `/features/${id}`,
      data: { data: params },
    });

    // Invalidate caches
    this.cache.delete(ApiCache.generateKey('pb_feature_get', { id }));
    this.cache.invalidatePattern('pb_feature_list:');
    this.cache.invalidatePattern('pb_feature_search:');

    return result.data;
  }

  async deleteFeature(id: string): Promise<void> {
    await this.request<void>({
      method: 'DELETE',
      url: `/features/${id}`,
    });

    // Invalidate caches
    this.cache.delete(ApiCache.generateKey('pb_feature_get', { id }));
    this.cache.invalidatePattern('pb_feature_list:');
    this.cache.invalidatePattern('pb_feature_search:');
  }

  async searchFeatures(query: string, limit = 50): Promise<Feature[]> {
    const cacheKey = ApiCache.generateKey('pb_feature_search', { query, limit });

    return this.cache.wrap(cacheKey, async () => {
      // ProductBoard doesn't have a dedicated search endpoint for features
      // We'll list all and filter client-side
      const features = await this.listFeatures({ limit: 500 });
      const queryLower = query.toLowerCase();

      return features
        .filter((f) => {
          const nameMatch = f.name?.toLowerCase().includes(queryLower);
          const descMatch = f.description?.toLowerCase().includes(queryLower);
          return nameMatch || descMatch;
        })
        .slice(0, limit);
    });
  }

  // ============================================
  // Product Methods
  // ============================================

  async listProducts(params: ListProductsParams = {}): Promise<Product[]> {
    const cacheKey = ApiCache.generateKey('pb_product_list', params as Record<string, unknown>);

    return this.cache.wrap(cacheKey, async () => {
      return this.paginate<Product>('/products', {}, params.limit);
    });
  }

  async getProduct(id: string): Promise<Product> {
    const cacheKey = ApiCache.generateKey('pb_product_get', { id });

    return this.cache.wrap(cacheKey, async () => {
      const result = await this.request<{ data: Product }>({
        method: 'GET',
        url: `/products/${id}`,
      });
      return result.data;
    });
  }

  async listComponents(params: { productId?: string; limit?: number } = {}): Promise<Component[]> {
    const cacheKey = ApiCache.generateKey('pb_component_list', params as Record<string, unknown>);

    return this.cache.wrap(cacheKey, async () => {
      const queryParams: Record<string, unknown> = {};
      if (params.productId) queryParams['product.id'] = params.productId;

      return this.paginate<Component>('/components', queryParams, params.limit);
    });
  }

  async getProductHierarchy(): Promise<ProductHierarchy> {
    const cacheKey = ApiCache.generateKey('pb_product_hierarchy', {});

    return this.cache.wrap(cacheKey, async () => {
      const [products, components] = await Promise.all([
        this.listProducts({ limit: 500 }),
        this.listComponents({ limit: 500 }),
      ]);

      return { products, components };
    });
  }

  // ============================================
  // Note Methods
  // ============================================

  async createNote(params: CreateNoteParams): Promise<Note> {
    const result = await this.request<{ data: Note }>({
      method: 'POST',
      url: '/notes',
      data: { data: params },
    });

    // Invalidate note list caches
    this.cache.invalidatePattern('pb_note_list:');

    return result.data;
  }

  async listNotes(params: ListNotesParams = {}): Promise<Note[]> {
    const cacheKey = ApiCache.generateKey('pb_note_list', params as Record<string, unknown>);

    return this.cache.wrap(cacheKey, async () => {
      const queryParams: Record<string, unknown> = {};
      if (params.createdFrom) queryParams.createdFrom = params.createdFrom;
      if (params.createdTo) queryParams.createdTo = params.createdTo;

      return this.paginate<Note>('/notes', queryParams, params.limit);
    });
  }

  async getNote(id: string): Promise<Note> {
    const cacheKey = ApiCache.generateKey('pb_note_get', { id });

    return this.cache.wrap(cacheKey, async () => {
      const result = await this.request<{ data: Note }>({
        method: 'GET',
        url: `/notes/${id}`,
      });
      return result.data;
    });
  }

  async attachNoteToFeature(noteId: string, featureId: string): Promise<void> {
    await this.request<void>({
      method: 'POST',
      url: `/notes/${noteId}/connections`,
      data: {
        data: {
          feature: { id: featureId },
        },
      },
    });

    // Invalidate caches
    this.cache.delete(ApiCache.generateKey('pb_note_get', { id: noteId }));
    this.cache.delete(ApiCache.generateKey('pb_feature_get', { id: featureId }));
  }

  // ============================================
  // User Methods
  // ============================================

  async getCurrentUser(): Promise<CurrentUser> {
    const cacheKey = ApiCache.generateKey('pb_user_current', {});

    return this.cache.wrap(cacheKey, async () => {
      const result = await this.request<{ data: CurrentUser }>({
        method: 'GET',
        url: '/users/me',
      });
      return result.data;
    });
  }

  async listUsers(params: ListUsersParams = {}): Promise<User[]> {
    const cacheKey = ApiCache.generateKey('pb_user_list', params as Record<string, unknown>);

    return this.cache.wrap(cacheKey, async () => {
      return this.paginate<User>('/users', {}, params.limit);
    });
  }

  // ============================================
  // Search Methods
  // ============================================

  async search(params: SearchParams): Promise<SearchResult[]> {
    const cacheKey = ApiCache.generateKey('pb_search', { query: params.query, type: params.type, limit: params.limit });

    return this.cache.wrap(cacheKey, async () => {
      const results: SearchResult[] = [];
      const queryLower = params.query.toLowerCase();
      const limit = params.limit || 50;

      // Search features
      if (!params.type || params.type === 'feature') {
        const features = await this.searchFeatures(queryLower, limit);
        results.push(
          ...features.map((f) => ({
            type: 'feature' as const,
            id: f.id,
            name: f.name,
            description: f.description,
            links: f.links,
          }))
        );
      }

      // Search products
      if (!params.type || params.type === 'product') {
        const products = await this.listProducts({ limit: 100 });
        const matchingProducts = products
          .filter(
            (p) =>
              p.name?.toLowerCase().includes(queryLower) ||
              p.description?.toLowerCase().includes(queryLower)
          )
          .slice(0, limit);

        results.push(
          ...matchingProducts.map((p) => ({
            type: 'product' as const,
            id: p.id,
            name: p.name,
            description: p.description,
            links: p.links,
          }))
        );
      }

      // Search components
      if (!params.type || params.type === 'component') {
        const components = await this.listComponents({ limit: 100 });
        const matchingComponents = components
          .filter(
            (c) =>
              c.name?.toLowerCase().includes(queryLower) ||
              c.description?.toLowerCase().includes(queryLower)
          )
          .slice(0, limit);

        results.push(
          ...matchingComponents.map((c) => ({
            type: 'component' as const,
            id: c.id,
            name: c.name,
            description: c.description,
            links: c.links,
          }))
        );
      }

      // Search notes
      if (!params.type || params.type === 'note') {
        const notes = await this.listNotes({ limit: 100 });
        const matchingNotes = notes
          .filter(
            (n) =>
              n.title?.toLowerCase().includes(queryLower) ||
              n.content?.toLowerCase().includes(queryLower)
          )
          .slice(0, limit);

        results.push(
          ...matchingNotes.map((n) => ({
            type: 'note' as const,
            id: n.id,
            title: n.title,
            content: n.content?.substring(0, 200),
            links: n.links,
          }))
        );
      }

      return results.slice(0, limit);
    });
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Validate the API token by making a test request
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; max: number } {
    return this.cache.stats();
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats(): { tokens: number; maxTokens: number; waitTime: number } {
    return this.rateLimiter.stats();
  }
}
