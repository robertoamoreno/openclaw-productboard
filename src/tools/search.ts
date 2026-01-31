/**
 * ProductBoard Search and User Tools
 */

import { ProductBoardClient } from '../client/api-client.js';
import { ToolDefinition, SearchParams } from '../client/types.js';

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
      handler: async (params) => {
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

        return {
          totalCount: results.length,
          query: params.query,
          results: grouped,
        };
      },
    },

    // pb_user_current
    {
      name: 'pb_user_current',
      description:
        'Get information about the currently authenticated user, including workspace details.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const user = await client.getCurrentUser();
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName: user.workspaceName,
        };
      },
    },

    // pb_user_list
    {
      name: 'pb_user_list',
      description:
        'List all users in the ProductBoard workspace. Useful for finding user IDs for assigning features.',
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
      handler: async (params) => {
        const users = await client.listUsers({
          limit: params.limit as number || 100,
        });
        return {
          count: users.length,
          users: users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
          })),
        };
      },
    },
  ];
}
