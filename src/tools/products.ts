/**
 * ProductBoard Product Management Tools
 */

import { ProductBoardClient } from '../client/api-client.js';
import { ToolDefinition } from '../client/types.js';

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
      handler: async (params) => {
        const products = await client.listProducts({
          limit: params.limit as number || 50,
        });
        return {
          count: products.length,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description?.substring(0, 200),
            createdAt: p.createdAt,
            url: p.links?.html,
          })),
        };
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
      handler: async (params) => {
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
            description: c.description?.substring(0, 200),
          }));
          result.componentCount = components.length;
        }

        return result;
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
      handler: async () => {
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
            description: product.description?.substring(0, 200),
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
                description: comp.description?.substring(0, 200),
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

        return {
          productCount: hierarchy.products.length,
          componentCount: hierarchy.components.length,
          hierarchy: Array.from(productMap.values()),
        };
      },
    },
  ];
}
