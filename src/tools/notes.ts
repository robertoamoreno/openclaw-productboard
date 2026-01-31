/**
 * ProductBoard Note/Feedback Management Tools
 */

import { ProductBoardClient } from '../client/api-client.js';
import { ToolDefinition, CreateNoteParams, ListNotesParams, toolResult } from '../client/types.js';
import { cleanText } from '../utils/sanitize.js';

export function createNoteTools(client: ProductBoardClient): ToolDefinition[] {
  return [
    // pb_note_create
    {
      name: 'pb_note_create',
      description:
        'Create a customer feedback note in ProductBoard. Notes capture customer insights, feature requests, or user feedback that can be linked to features.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The note content/feedback text (required, supports HTML)',
          },
          title: {
            type: 'string',
            description: 'Optional title for the note',
          },
          displayUrl: {
            type: 'string',
            description: 'URL to the original source (e.g., support ticket, Slack message)',
          },
          sourceOrigin: {
            type: 'string',
            description: 'Origin system identifier (e.g., "zendesk", "intercom", "slack")',
          },
          sourceRecordId: {
            type: 'string',
            description: 'Record ID in the origin system',
          },
          userEmail: {
            type: 'string',
            description: 'Email of the user who provided the feedback',
          },
          userName: {
            type: 'string',
            description: 'Name of the user who provided the feedback',
          },
          companyName: {
            type: 'string',
            description: 'Company/organization name of the feedback source',
          },
          companyId: {
            type: 'string',
            description: 'External company ID',
          },
          tags: {
            type: 'array',
            description: 'Array of tags to categorize the note',
            items: { type: 'string' },
          },
        },
        required: ['content'],
      },
      execute: async (params) => {
        const createParams: CreateNoteParams = {
          content: params.content as string,
          title: params.title as string | undefined,
          displayUrl: params.displayUrl as string | undefined,
          tags: params.tags as string[] | undefined,
        };

        // Set source if provided
        if (params.sourceOrigin || params.sourceRecordId) {
          createParams.source = {
            origin: params.sourceOrigin as string | undefined,
            record_id: params.sourceRecordId as string | undefined,
          };
        }

        // Set user if provided
        if (params.userEmail) {
          createParams.user = {
            email: params.userEmail as string,
            name: params.userName as string | undefined,
          };
        }

        // Set company if provided
        if (params.companyName || params.companyId) {
          createParams.company = {
            name: params.companyName as string | undefined,
            id: params.companyId as string | undefined,
          };
        }

        const note = await client.createNote(createParams);
        return toolResult({
          success: true,
          note: {
            id: note.id,
            title: note.title,
            content: cleanText(note.content, 200),
            user: note.user?.email,
            company: note.company?.name,
            tags: note.tags,
            url: note.links?.html,
          },
        });
      },
    },

    // pb_note_list
    {
      name: 'pb_note_list',
      description:
        'List customer feedback notes in ProductBoard. Can filter by date range.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of notes to return (default: 50)',
            default: 50,
          },
          createdFrom: {
            type: 'string',
            description: 'Filter notes created on or after this date (ISO 8601)',
          },
          createdTo: {
            type: 'string',
            description: 'Filter notes created on or before this date (ISO 8601)',
          },
        },
      },
      execute: async (params) => {
        const listParams: ListNotesParams = {
          limit: params.limit as number || 50,
          createdFrom: params.createdFrom as string | undefined,
          createdTo: params.createdTo as string | undefined,
        };

        const notes = await client.listNotes(listParams);
        return toolResult({
          count: notes.length,
          notes: notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: cleanText(n.content, 200),
            user: n.user?.email,
            company: n.company?.name,
            tags: n.tags,
            featureCount: n.features?.length || 0,
            createdAt: n.createdAt,
            url: n.links?.html,
          })),
        });
      },
    },

    // pb_note_attach
    {
      name: 'pb_note_attach',
      description:
        'Attach a note to a feature. This links customer feedback to a specific feature for insights aggregation.',
      parameters: {
        type: 'object',
        properties: {
          noteId: {
            type: 'string',
            description: 'ID of the note to attach',
          },
          featureId: {
            type: 'string',
            description: 'ID of the feature to attach the note to',
          },
        },
        required: ['noteId', 'featureId'],
      },
      execute: async (params) => {
        await client.attachNoteToFeature(
          params.noteId as string,
          params.featureId as string
        );
        return toolResult({
          success: true,
          message: `Note ${params.noteId} has been attached to feature ${params.featureId}`,
        });
      },
    },
  ];
}
