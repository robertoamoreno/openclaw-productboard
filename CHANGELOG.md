# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-30

### Added

- Initial release of OpenClaw ProductBoard plugin
- **15 Agent Tools**:
  - Feature management: `pb_feature_create`, `pb_feature_list`, `pb_feature_get`, `pb_feature_update`, `pb_feature_delete`, `pb_feature_search`
  - Product management: `pb_product_list`, `pb_product_get`, `pb_product_hierarchy`
  - Notes & feedback: `pb_note_create`, `pb_note_list`, `pb_note_attach`
  - Search & users: `pb_search`, `pb_user_current`, `pb_user_list`
- **3 Skills**:
  - `productboard-search` - Search and explore ProductBoard data
  - `productboard-feedback` - Capture customer feedback
  - `productboard-release` - Release planning workflows
- **Core Features**:
  - Bearer token authentication
  - LRU caching with configurable TTL
  - Token bucket rate limiting
  - Automatic retries with exponential backoff
  - Comprehensive error handling
  - Full TypeScript support

### Technical Details

- Built with TypeScript 5.3+
- Uses axios for HTTP requests
- Uses lru-cache for caching
- Targets Node.js 18+
