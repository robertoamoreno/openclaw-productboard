# OpenClaw ProductBoard Plugin

A lean, fast OpenClaw plugin for ProductBoard integration. Provides 15 agent tools for managing features, products, customer feedback notes, and workspace users, plus 3 skills for common workflows.

## Features

- **15 Agent Tools** for full ProductBoard API coverage
- **3 Skills** for search, feedback capture, and release planning
- **LRU Caching** with configurable TTL for read operations
- **Rate Limiting** with token bucket algorithm
- **Automatic Retries** with exponential backoff
- **Bearer Token Authentication**

## Installation

```bash
openclaw plugins install -l ./openclaw-productboard
```

Or install from npm (coming soon):

```bash
openclaw plugins install openclaw-productboard
```

## Configuration

Add your ProductBoard API token to your OpenClaw configuration:

```json
{
  "plugins": {
    "entries": {
      "productboard": {
        "config": {
          "apiToken": "pb_your_api_token_here",
          "apiBaseUrl": "https://api.productboard.com",
          "cacheTtlSeconds": 300,
          "rateLimitPerMinute": 100
        }
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiToken` | string | Yes | - | ProductBoard API bearer token |
| `apiBaseUrl` | string | No | `https://api.productboard.com` | API base URL |
| `cacheTtlSeconds` | number | No | `300` | Cache TTL for read operations |
| `rateLimitPerMinute` | number | No | `100` | Max API requests per minute |

### Getting Your API Token

1. Log in to ProductBoard
2. Go to **Settings** → **Integrations** → **Public API**
3. Generate a new API token
4. Copy the token and add it to your configuration

## Agent Tools

### Feature Management (6 tools)

| Tool | Description |
|------|-------------|
| `pb_feature_create` | Create a new feature |
| `pb_feature_list` | List features with optional filters |
| `pb_feature_get` | Get detailed feature information |
| `pb_feature_update` | Update an existing feature |
| `pb_feature_delete` | Archive/delete a feature |
| `pb_feature_search` | Search features by name or description |

### Product Management (3 tools)

| Tool | Description |
|------|-------------|
| `pb_product_list` | List all products |
| `pb_product_get` | Get product details with components |
| `pb_product_hierarchy` | Get complete product/component tree |

### Notes & Feedback (3 tools)

| Tool | Description |
|------|-------------|
| `pb_note_create` | Create customer feedback note |
| `pb_note_list` | List notes with date filters |
| `pb_note_attach` | Attach note to a feature |

### Search & Users (3 tools)

| Tool | Description |
|------|-------------|
| `pb_search` | Global search across all entities |
| `pb_user_current` | Get current authenticated user |
| `pb_user_list` | List workspace users |

## Skills

### ProductBoard Search (`/productboard-search`)

Search and explore your ProductBoard workspace. Find features, products, components, and customer feedback using natural language queries.

```
/productboard-search
```

### ProductBoard Feedback (`/productboard-feedback`)

Capture customer feedback and link it to features. Create notes from support tickets, user interviews, or any customer interaction.

```
/productboard-feedback
```

### ProductBoard Release (`/productboard-release`)

Plan and manage releases by organizing features, tracking progress, and updating statuses. (Internal skill, not user-invocable)

## Usage Examples

### Create a Feature

```
Create a new feature called "Dark Mode Support" in ProductBoard with status "candidate"
```

### Search Features

```
Search ProductBoard for features related to "authentication"
```

### Capture Customer Feedback

```
Create a note in ProductBoard: "Customer requested ability to export reports to PDF"
from user john@acme.com at Acme Corp, tagged as "feature-request"
```

### View Product Structure

```
Show me the ProductBoard product hierarchy
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

### Project Structure

```
openclaw-productboard/
├── openclaw.plugin.json     # Plugin manifest
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── src/
│   ├── index.ts             # Plugin entry point
│   ├── client/
│   │   ├── api-client.ts    # ProductBoard API client
│   │   ├── types.ts         # TypeScript types
│   │   └── errors.ts        # Error handling
│   ├── tools/
│   │   ├── features.ts      # Feature tools
│   │   ├── products.ts      # Product tools
│   │   ├── notes.ts         # Note tools
│   │   └── search.ts        # Search & user tools
│   └── utils/
│       ├── cache.ts         # LRU cache
│       └── rate-limiter.ts  # Rate limiting
└── skills/
    ├── productboard-search/
    ├── productboard-feedback/
    └── productboard-release/
```

## API Reference

This plugin uses the [ProductBoard Public API](https://developer.productboard.com/). The following endpoints are utilized:

- `GET/POST/PATCH/DELETE /features` - Feature management
- `GET /products` - Product listing
- `GET /components` - Component listing
- `GET/POST /notes` - Note management
- `POST /notes/{id}/connections` - Note-feature linking
- `GET /users` - User listing
- `GET /users/me` - Current user

## Error Handling

The plugin handles common API errors gracefully:

- **401 Unauthorized** - Invalid or expired API token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource doesn't exist
- **429 Rate Limited** - Automatic retry with backoff
- **5xx Server Errors** - Automatic retry with exponential backoff

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Links

- [ProductBoard](https://www.productboard.com/)
- [ProductBoard API Documentation](https://developer.productboard.com/)
- [OpenClaw](https://openclaw.dev/)
