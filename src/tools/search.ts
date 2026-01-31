/**
 * ProductBoard Search and User Tools
 */

import { ProductBoardClient } from '../client/api-client.js';
import { ToolDefinition, SearchParams, toolResult } from '../client/types.js';

export function createSearchTools(client: ProductBoardClient): ToolDefinition[] {
  return [
    // pb_search
    {
      name: 'pb_search',
      description:
        'Global search across ProductBoard. Searches features, products, components, and notes by name, title, or content.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query text',
          },
          type: {
            type: 'string',
            description: 'Limit search to specific type',
            enum: ['feature', 'product', 'component', 'note'],
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default: 25)',
            default: 25,
          },
        },
        required: ['query'],
      },
      execute: async (params) => {
        const searchParams: SearchParams = {
          query: params.query as string,
          type: params.type as 'feature' | 'note' | 'product' | 'component' | undefined,
          limit: params.limit as number || 25,
        };

        const results = await client.search(searchParams);

        // Group results by type
        const grouped: Record<string, unknown[]> = {
          features: [],
          products: [],
          components: [],
          notes: [],
        };

        for (const result of results) {
          const key = result.type + 's';
          if (grouped[key]) {
            grouped[key].push({
              id: result.id,
              name: result.name || result.title,
              description: result.description || result.content,
              url: result.links?.html,
            });
          }
        }

        return toolResult({
          totalCount: results.length,
          query: params.query,
          results: grouped,
        });
      },
    },

    // pb_user_current
    {
      name: 'pb_user_current',
      description:
        'Validate the API token and confirm access to ProductBoard. Note: ProductBoard API does not expose current user details.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        await client.getCurrentUser();
        return toolResult({
          authenticated: true,
          message: 'API token is valid and has access to ProductBoard',
          note: 'ProductBoard API does not provide current user details. Use pb_user_list to see workspace members.',
        });
      },
    },

    // pb_user_list
    {
      name: 'pb_user_list',
      description:
        'List customer/feedback users in ProductBoard. These are people who have provided feedback, not workspace team members.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of users to return (default: 100)',
            default: 100,
          },
        },
      },
      execute: async (params) => {
        const users = await client.listUsers({
          limit: params.limit as number || 100,
        });
        return toolResult({
          count: users.length,
          users: users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
          })),
        });
      },
    },
  ];
}
