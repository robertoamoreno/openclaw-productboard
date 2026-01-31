/**
 * ProductBoard Feature Management Tools
 */

import { ProductBoardClient } from '../client/api-client.js';
import {
  ToolDefinition,
  CreateFeatureParams,
  UpdateFeatureParams,
  ListFeaturesParams,
  FeatureStatus,
} from '../client/types.js';
import { cleanText } from '../utils/sanitize.js';

export function createFeatureTools(client: ProductBoardClient): ToolDefinition[] {
  return [
    // pb_feature_create
    {
      name: 'pb_feature_create',
      description:
        'Create a new feature in ProductBoard. Features represent product functionality, user stories, or items in your product backlog.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the feature (required)',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the feature (supports HTML)',
          },
          status: {
            type: 'string',
            description: 'Feature status',
            enum: ['new', 'in-progress', 'shipped', 'archived', 'postponed', 'candidate'],
          },
          productId: {
            type: 'string',
            description: 'ID of the parent product to assign this feature to',
          },
          componentId: {
            type: 'string',
            description: 'ID of the parent component to assign this feature to',
          },
          parentFeatureId: {
            type: 'string',
            description: 'ID of the parent feature (for sub-features)',
          },
          ownerEmail: {
            type: 'string',
            description: 'Email of the feature owner',
          },
          startDate: {
            type: 'string',
            description: 'Planned start date (ISO 8601 format)',
          },
          endDate: {
            type: 'string',
            description: 'Planned end date (ISO 8601 format)',
          },
        },
        required: ['name'],
      },
      execute: async (params) => {
        const createParams: CreateFeatureParams = {
          name: params.name as string,
          description: params.description as string | undefined,
          status: params.status as FeatureStatus | undefined,
        };

        // Build parent reference
        if (params.productId || params.componentId || params.parentFeatureId) {
          createParams.parent = {};
          if (params.productId) createParams.parent.product = { id: params.productId as string };
          if (params.componentId) createParams.parent.component = { id: params.componentId as string };
          if (params.parentFeatureId) createParams.parent.feature = { id: params.parentFeatureId as string };
        }

        // Set owner
        if (params.ownerEmail) {
          createParams.owner = { email: params.ownerEmail as string };
        }

        // Set timeframe
        if (params.startDate || params.endDate) {
          createParams.timeframe = {
            startDate: params.startDate as string | undefined,
            endDate: params.endDate as string | undefined,
          };
        }

        const feature = await client.createFeature(createParams);
        return {
          success: true,
          feature: {
            id: feature.id,
            name: feature.name,
            status: feature.status,
            url: feature.links?.html,
          },
        };
      },
    },

    // pb_feature_list
    {
      name: 'pb_feature_list',
      description:
        'List features in ProductBoard with optional filters. Returns features from your product backlog.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Filter by product ID',
          },
          componentId: {
            type: 'string',
            description: 'Filter by component ID',
          },
          status: {
            type: 'string',
            description: 'Filter by status',
            enum: ['new', 'in-progress', 'shipped', 'archived', 'postponed', 'candidate'],
          },
          ownerId: {
            type: 'string',
            description: 'Filter by owner ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of features to return (default: 50, max: 500)',
            default: 50,
          },
        },
      },
      execute: async (params) => {
        console.log('[pb_feature_list] Starting execution');
        const listParams: ListFeaturesParams = {
          productId: params.productId as string | undefined,
          componentId: params.componentId as string | undefined,
          status: params.status as FeatureStatus | undefined,
          ownerId: params.ownerId as string | undefined,
          limit: Math.min(params.limit as number || 50, 500),
        };

        const features = await client.listFeatures(listParams);
        console.log('[pb_feature_list] Got features:', features.length);
        const result = {
          count: features.length,
          features: features.map((f) => ({
            id: f.id,
            name: f.name,
            status: f.status,
            description: cleanText(f.description, 200),
            owner: f.owner?.email,
            url: f.links?.html,
          })),
        };
        console.log('[pb_feature_list] Returning result:', JSON.stringify(result).substring(0, 200));
        // Try returning as string in case OpenClaw expects that
        return JSON.stringify(result, null, 2);
      },
    },

    // pb_feature_get
    {
      name: 'pb_feature_get',
      description:
        'Get detailed information about a specific feature by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Feature ID',
          },
        },
        required: ['id'],
      },
      execute: async (params) => {
        const feature = await client.getFeature(params.id as string);
        return {
          id: feature.id,
          name: feature.name,
          description: feature.description,
          status: feature.status,
          owner: feature.owner?.email,
          parent: feature.parent,
          timeframe: feature.timeframe,
          createdAt: feature.createdAt,
          updatedAt: feature.updatedAt,
          url: feature.links?.html,
        };
      },
    },

    // pb_feature_update
    {
      name: 'pb_feature_update',
      description:
        'Update an existing feature in ProductBoard. Only provided fields will be updated.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Feature ID to update',
          },
          name: {
            type: 'string',
            description: 'New name for the feature',
          },
          description: {
            type: 'string',
            description: 'New description (supports HTML)',
          },
          status: {
            type: 'string',
            description: 'New status',
            enum: ['new', 'in-progress', 'shipped', 'archived', 'postponed', 'candidate'],
          },
          productId: {
            type: 'string',
            description: 'Move to a different product',
          },
          componentId: {
            type: 'string',
            description: 'Move to a different component',
          },
          ownerEmail: {
            type: 'string',
            description: 'New owner email',
          },
          startDate: {
            type: 'string',
            description: 'New start date (ISO 8601)',
          },
          endDate: {
            type: 'string',
            description: 'New end date (ISO 8601)',
          },
        },
        required: ['id'],
      },
      execute: async (params) => {
        const updateParams: UpdateFeatureParams = {};

        if (params.name) updateParams.name = params.name as string;
        if (params.description) updateParams.description = params.description as string;
        if (params.status) updateParams.status = params.status as FeatureStatus;

        if (params.productId || params.componentId) {
          updateParams.parent = {};
          if (params.productId) updateParams.parent.product = { id: params.productId as string };
          if (params.componentId) updateParams.parent.component = { id: params.componentId as string };
        }

        if (params.ownerEmail) {
          updateParams.owner = { email: params.ownerEmail as string };
        }

        if (params.startDate || params.endDate) {
          updateParams.timeframe = {
            startDate: params.startDate as string | undefined,
            endDate: params.endDate as string | undefined,
          };
        }

        const feature = await client.updateFeature(params.id as string, updateParams);
        return {
          success: true,
          feature: {
            id: feature.id,
            name: feature.name,
            status: feature.status,
            url: feature.links?.html,
          },
        };
      },
    },

    // pb_feature_delete
    {
      name: 'pb_feature_delete',
      description:
        'Archive/delete a feature from ProductBoard. This action can be undone in ProductBoard.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Feature ID to delete',
          },
        },
        required: ['id'],
      },
      execute: async (params) => {
        await client.deleteFeature(params.id as string);
        return {
          success: true,
          message: `Feature ${params.id} has been archived`,
        };
      },
    },

    // pb_feature_search
    {
      name: 'pb_feature_search',
      description:
        'Search for features by name or description. Returns matching features ordered by relevance.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (searches name and description)',
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default: 20)',
            default: 20,
          },
        },
        required: ['query'],
      },
      execute: async (params) => {
        const features = await client.searchFeatures(
          params.query as string,
          params.limit as number || 20
        );
        return {
          count: features.length,
          features: features.map((f) => ({
            id: f.id,
            name: f.name,
            status: f.status,
            description: cleanText(f.description, 200),
            url: f.links?.html,
          })),
        };
      },
    },
  ];
}
