/**
 * ProductBoard Product Management Tools
 */

import { ProductBoardClient } from '../client/api-client.js';
import { ToolDefinition, toolResult } from '../client/types.js';
import { cleanText } from '../utils/sanitize.js';

export function createProductTools(client: ProductBoardClient): ToolDefinition[] {
  return [
    // pb_product_list
    {
      name: 'pb_product_list',
      description:
        'List all products in the ProductBoard workspace. Products are top-level containers for organizing features.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of products to return (default: 50)',
            default: 50,
          },
        },
      },
      execute: async (params) => {
        console.log('[pb_product_list] Starting execution');
        const products = await client.listProducts({
          limit: params.limit as number || 50,
        });
        console.log('[pb_product_list] Got products:', products.length);
        const result = {
          count: products.length,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            description: cleanText(p.description, 200),
            createdAt: p.createdAt,
            url: p.links?.html,
          })),
        };
        console.log('[pb_product_list] Returning result:', JSON.stringify(result).substring(0, 200));
        return toolResult(result);
      },
    },

    // pb_product_get
    {
      name: 'pb_product_get',
      description:
        'Get detailed information about a specific product by ID, including its components.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Product ID',
          },
          includeComponents: {
            type: 'boolean',
            description: 'Include the list of components under this product',
            default: true,
          },
        },
        required: ['id'],
      },
      execute: async (params) => {
        const product = await client.getProduct(params.id as string);

        const result: Record<string, unknown> = {
          id: product.id,
          name: product.name,
          description: product.description,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          url: product.links?.html,
        };

        // Optionally include components
        if (params.includeComponents !== false) {
          const components = await client.listComponents({
            productId: product.id,
            limit: 100,
          });
          result.components = components.map((c) => ({
            id: c.id,
            name: c.name,
            description: cleanText(c.description, 200),
          }));
          result.componentCount = components.length;
        }

        return toolResult(result);
      },
    },

    // pb_product_hierarchy
    {
      name: 'pb_product_hierarchy',
      description:
        'Get the complete product hierarchy including all products and their components. Useful for understanding the workspace structure.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const hierarchy = await client.getProductHierarchy();

        // Build tree structure
        const productMap = new Map<string, {
          id: string;
          name: string;
          description?: string;
          components: Array<{
            id: string;
            name: string;
            description?: string;
            subcomponents: Array<{ id: string; name: string }>;
          }>;
        }>();

        // Initialize products
        for (const product of hierarchy.products) {
          productMap.set(product.id, {
            id: product.id,
            name: product.name,
            description: cleanText(product.description, 200),
            components: [],
          });
        }

        // Build component tree (components can be nested)
        const componentMap = new Map<string, typeof hierarchy.components[0] & { subcomponents: Array<{ id: string; name: string }> }>();

        for (const component of hierarchy.components) {
          componentMap.set(component.id, {
            ...component,
            subcomponents: [],
          });
        }

        // Assign components to parents
        for (const component of hierarchy.components) {
          const comp = componentMap.get(component.id)!;

          if (component.parent?.product?.id) {
            // Top-level component under a product
            const product = productMap.get(component.parent.product.id);
            if (product) {
              product.components.push({
                id: comp.id,
                name: comp.name,
                description: cleanText(comp.description, 200),
                subcomponents: comp.subcomponents,
              });
            }
          } else if (component.parent?.component?.id) {
            // Nested component
            const parent = componentMap.get(component.parent.component.id);
            if (parent) {
              parent.subcomponents.push({
                id: comp.id,
                name: comp.name,
              });
            }
          }
        }

        return toolResult({
          productCount: hierarchy.products.length,
          componentCount: hierarchy.components.length,
          hierarchy: Array.from(productMap.values()),
        });
      },
    },
  ];
}
