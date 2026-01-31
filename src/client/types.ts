/**
 * ProductBoard API Type Definitions
 */

// Base types
export interface PaginatedResponse<T> {
  data: T[];
  links?: {
    next?: string;
    prev?: string;
  };
  totalResults?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Feature types
export interface Feature {
  id: string;
  name: string;
  description?: string;
  status?: FeatureStatus;
  parent?: {
    feature?: { id: string };
    product?: { id: string };
    component?: { id: string };
  };
  owner?: { email: string };
  timeframe?: { startDate?: string; endDate?: string };
  createdAt: string;
  updatedAt: string;
  links?: {
    self: string;
    html: string;
  };
}

export type FeatureStatus =
  | 'new'
  | 'in-progress'
  | 'shipped'
  | 'archived'
  | 'postponed'
  | 'candidate';

export interface CreateFeatureParams {
  name: string;
  description?: string;
  status?: FeatureStatus;
  parent?: {
    product?: { id: string };
    component?: { id: string };
    feature?: { id: string };
  };
  owner?: { email: string };
  timeframe?: { startDate?: string; endDate?: string };
}

export interface UpdateFeatureParams {
  name?: string;
  description?: string;
  status?: FeatureStatus;
  parent?: {
    product?: { id: string };
    component?: { id: string };
    feature?: { id: string };
  };
  owner?: { email: string };
  timeframe?: { startDate?: string; endDate?: string };
}

export interface ListFeaturesParams {
  productId?: string;
  componentId?: string;
  status?: FeatureStatus;
  ownerId?: string;
  limit?: number;
  cursor?: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  links?: {
    self: string;
    html: string;
  };
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  parent?: {
    product?: { id: string };
    component?: { id: string };
  };
  createdAt: string;
  updatedAt: string;
  links?: {
    self: string;
    html: string;
  };
}

export interface ProductHierarchy {
  products: Product[];
  components: Component[];
}

export interface ListProductsParams {
  limit?: number;
  cursor?: string;
}

// Note types
export interface Note {
  id: string;
  title?: string;
  content: string;
  displayUrl?: string;
  source?: {
    origin?: string;
    record_id?: string;
  };
  user?: {
    email: string;
    name?: string;
  };
  company?: {
    id?: string;
    name?: string;
  };
  tags?: string[];
  features?: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string;
  links?: {
    self: string;
    html: string;
  };
}

export interface CreateNoteParams {
  title?: string;
  content: string;
  displayUrl?: string;
  source?: {
    origin?: string;
    record_id?: string;
  };
  user?: {
    email: string;
    name?: string;
  };
  company?: {
    id?: string;
    name?: string;
  };
  tags?: string[];
}

export interface ListNotesParams {
  limit?: number;
  cursor?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface AttachNoteParams {
  noteId: string;
  featureId: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt?: string;
}

export interface CurrentUser extends User {
  workspaceId?: string;
  workspaceName?: string;
}

export interface ListUsersParams {
  limit?: number;
  cursor?: string;
}

// Search types
export interface SearchParams {
  query: string;
  type?: 'feature' | 'note' | 'product' | 'component';
  limit?: number;
}

export interface SearchResult {
  type: 'feature' | 'note' | 'product' | 'component';
  id: string;
  name?: string;
  title?: string;
  content?: string;
  description?: string;
  score?: number;
  links?: {
    self: string;
    html: string;
  };
}

// Plugin configuration
export interface PluginConfig {
  apiToken: string;
  apiBaseUrl?: string;
  cacheTtlSeconds?: number;
  rateLimitPerMinute?: number;
}

// OpenClaw Plugin API types
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
}

export interface PluginAPI {
  config: Record<string, unknown>;  // Full OpenClaw config
  pluginConfig?: PluginConfig;      // Plugin-specific config (preferred)
  registerTool: (tool: ToolDefinition) => void;
  log?: {
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}
