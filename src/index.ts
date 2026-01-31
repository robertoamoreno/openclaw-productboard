/**
 * ProductBoard OpenClaw Plugin
 *
 * Provides integration with ProductBoard for managing features, products,
 * customer feedback notes, and workspace users.
 */

import { ProductBoardClient } from './client/api-client';
import { PluginAPI, PluginConfig } from './client/types';
import {
  createFeatureTools,
  createProductTools,
  createNoteTools,
  createSearchTools,
} from './tools';

/**
 * Plugin registration function called by OpenClaw
 */
export default function register(api: PluginAPI): void {
  const config = api.config as PluginConfig;

  // Validate required configuration
  if (!config.apiToken) {
    api.log.error('ProductBoard API token is required');
    throw new Error('ProductBoard API token is required. Set it in plugin configuration.');
  }

  api.log.info('Initializing ProductBoard plugin');

  // Initialize the API client
  const client = new ProductBoardClient(config);

  // Validate token on startup (non-blocking)
  validateTokenAsync(client, api);

  // Register all tools
  const allTools = [
    ...createFeatureTools(client),
    ...createProductTools(client),
    ...createNoteTools(client),
    ...createSearchTools(client),
  ];

  for (const tool of allTools) {
    api.registerTool(tool);
    api.log.debug(`Registered tool: ${tool.name}`);
  }

  api.log.info(`ProductBoard plugin initialized with ${allTools.length} tools`);
}

/**
 * Validate API token asynchronously
 */
async function validateTokenAsync(client: ProductBoardClient, api: PluginAPI): Promise<void> {
  try {
    const isValid = await client.validateToken();
    if (isValid) {
      api.log.info('ProductBoard API token validated successfully');
    } else {
      api.log.warn('ProductBoard API token validation failed - requests may fail with 401');
    }
  } catch (error) {
    api.log.warn('Could not validate ProductBoard API token', { error });
  }
}

// Export types for consumers
export type { PluginAPI, PluginConfig } from './client/types';
export { ProductBoardClient } from './client/api-client';
export { ProductBoardError } from './client/errors';
