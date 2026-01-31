/**
 * ProductBoard OpenClaw Plugin
 *
 * Provides integration with ProductBoard for managing features, products,
 * customer feedback notes, and workspace users.
 */

import { ProductBoardClient } from './client/api-client.js';
import { PluginAPI, PluginConfig } from './client/types.js';
import {
  createFeatureTools,
  createProductTools,
  createNoteTools,
  createSearchTools,
} from './tools/index.js';

// Create a safe logger that falls back to console
function createLogger(api: PluginAPI) {
  const log = api.log;
  return {
    info: (msg: string, data?: unknown) => log?.info?.(msg, data) ?? console.log(`[productboard] ${msg}`, data ?? ''),
    warn: (msg: string, data?: unknown) => log?.warn?.(msg, data) ?? console.warn(`[productboard] ${msg}`, data ?? ''),
    error: (msg: string, data?: unknown) => log?.error?.(msg, data) ?? console.error(`[productboard] ${msg}`, data ?? ''),
    debug: (msg: string, data?: unknown) => log?.debug?.(msg, data) ?? undefined,
  };
}

/**
 * Plugin registration function called by OpenClaw
 */
export default function register(api: PluginAPI): void {
  const logger = createLogger(api);

  // OpenClaw passes plugin-specific config in api.pluginConfig
  const config = (api.pluginConfig ?? {}) as PluginConfig;

  // Check for API token - don't throw, just warn and skip tool registration
  if (!config.apiToken) {
    logger.warn('ProductBoard API token not configured. Add apiToken to plugins.entries.openclaw-productboard.config in ~/.openclaw/openclaw.json');
    return;
  }

  logger.info('Initializing ProductBoard plugin');

  // Initialize the API client
  const client = new ProductBoardClient(config);

  // Validate token on startup (non-blocking)
  validateTokenAsync(client, logger);

  // Register all tools
  const allTools = [
    ...createFeatureTools(client),
    ...createProductTools(client),
    ...createNoteTools(client),
    ...createSearchTools(client),
  ];

  for (const tool of allTools) {
    api.registerTool(tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  logger.info(`ProductBoard plugin initialized with ${allTools.length} tools`);
}

type Logger = ReturnType<typeof createLogger>;

/**
 * Validate API token asynchronously
 */
async function validateTokenAsync(client: ProductBoardClient, logger: Logger): Promise<void> {
  try {
    const isValid = await client.validateToken();
    if (isValid) {
      logger.info('ProductBoard API token validated successfully');
    } else {
      logger.warn('ProductBoard API token validation failed - requests may fail with 401');
    }
  } catch (error) {
    logger.warn('Could not validate ProductBoard API token', { error });
  }
}

// Export types for consumers
export type { PluginAPI, PluginConfig } from './client/types.js';
export { ProductBoardClient } from './client/api-client.js';
export { ProductBoardError } from './client/errors.js';
