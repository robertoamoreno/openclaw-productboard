---
name: productboard-feedback
description: Create and manage customer feedback notes in ProductBoard
user-invocable: true
---

# ProductBoard Feedback Skill

Capture customer feedback, feature requests, and user insights in ProductBoard. Link feedback to features to aggregate customer evidence.

## Available Tools

- `pb_note_create` - Create a new customer feedback note
- `pb_note_list` - List existing notes
- `pb_note_attach` - Link a note to a feature
- `pb_feature_search` - Find features to link notes to
- `pb_feature_list` - List features for context

## Capturing Feedback

### Creating Notes

Use `pb_note_create` with:

**Required**:
- `content` - The feedback text (supports HTML)

**Recommended**:
- `title` - Brief summary of the feedback
- `userEmail` - Who provided the feedback
- `userName` - User's name
- `companyName` - Their company/organization
- `tags` - Categories like "bug", "feature-request", "ux"

**Optional**:
- `displayUrl` - Link to original source (support ticket, Slack, etc.)
- `sourceOrigin` - System identifier (e.g., "zendesk", "intercom")
- `sourceRecordId` - ID in the source system

### Linking to Features

1. Find the relevant feature using `pb_feature_search` or `pb_feature_list`
2. Use `pb_note_attach` with the `noteId` and `featureId`

## Workflow Examples

### Capture Support Ticket Feedback

```
1. pb_note_create:
   - content: "User reports login takes too long on mobile devices"
   - title: "Slow mobile login"
   - userEmail: "customer@company.com"
   - userName: "Jane Smith"
   - companyName: "Acme Corp"
   - tags: ["performance", "mobile", "authentication"]
   - sourceOrigin: "zendesk"
   - sourceRecordId: "12345"
   - displayUrl: "https://zendesk.com/tickets/12345"

2. pb_feature_search with query "mobile login" to find related feature

3. pb_note_attach to link the note to the feature
```

### Capture Feature Request

```
1. pb_note_create:
   - content: "Would love to have dark mode support in the app"
   - title: "Dark mode request"
   - userEmail: "user@example.com"
   - tags: ["feature-request", "ui", "accessibility"]

2. pb_feature_search with query "dark mode"

3. If feature exists: pb_note_attach
   If not: Consider creating feature with pb_feature_create
```

### Batch Feedback Processing

1. Use `pb_note_list` to review recent unlinked notes
2. For each note, search for relevant features
3. Attach notes to appropriate features

## Best Practices

- **Always include context**: Add user email, company, and source URL when available
- **Use consistent tags**: Establish a tagging convention (bug, feature-request, ux, performance, etc.)
- **Link to features**: Attached notes contribute to feature insights and prioritization
- **Keep titles concise**: Use title for quick scanning, content for details
- **Track the source**: Include sourceOrigin and sourceRecordId for traceability

## Integration Points

- **Support Systems**: Zendesk, Intercom, Freshdesk
- **Communication**: Slack, Microsoft Teams, Email
- **Sales/CRM**: Salesforce, HubSpot, Pipedrive
- **User Research**: UserTesting, Hotjar, surveys

When capturing feedback from these systems, always include:
1. The original source URL (displayUrl)
2. The system name (sourceOrigin)
3. The record ID (sourceRecordId)
