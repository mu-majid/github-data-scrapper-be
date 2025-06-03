# Backend API Endpoints Summary

## Authentication Endpoints (`/api/auth`)

| Endpoint | Method | Purpose | Requirement Served |
|----------|--------|---------|-------------------|
| `/github` | GET | Initiate GitHub OAuth flow, returns auth URL | OAuth (2) authentication setup |
| `/github/callback` | GET | Handle OAuth callback, exchange code for token | Complete OAuth flow, redirect after success |
| `/status` | GET | Check if user is authenticated and get integration details | Display connection status and user info |
| `/logout` | POST | Logout user (client discards JWT token) | Session management |
| `/remove` | DELETE | Remove GitHub integration from database | "Remove Integration" button functionality |
| `/verify` | POST | Verify JWT token validity | Token validation |

## GitHub Operations (`/api/github`)

| Endpoint | Method | Purpose | Requirement Served |
|----------|--------|---------|-------------------|
| `/sync` | POST | Sync all GitHub data (orgs, repos, commits, pulls, issues, users) | Fetch and store all required GitHub data |
| `/sync-status` | GET | Get last sync time and data counts | Display sync status and data statistics |
| `/rate-limit` | GET | Check GitHub API rate limit | Monitor API usage |
| `/organizations` | GET | Get user's GitHub organizations | Fetch organizations data |
| `/validate-token` | GET | Validate GitHub access token | Ensure token is still valid |

## Data Management (`/api/data`)

| Endpoint | Method | Purpose | Requirement Served |
|----------|--------|---------|-------------------|
| `/collections` | GET | Get list of available collections with counts | Populate "Entity Dropdown" with collections |
| `/collection/:name` | GET | Get paginated data from specific collection | Display data in AG Grid table |
| `/collection/:name/fields` | GET | Get field definitions for AG Grid columns | Dynamic column setup for AG Grid |
| `/collection/:name/export` | GET | Export collection data (JSON/CSV) | Data export functionality |
| `/collection/:name/stats` | GET | Get collection statistics | Display data metrics |
| `/collection/:name/record/:id` | DELETE | Delete specific record | Data management |
| `/collection/:name/clear` | DELETE | Clear entire collection | Data management |
| `/search` | GET | Search across all collections | Global search functionality in AG Grid |

## Requirements Mapping

**Core OAuth Requirements:**
- Connect button → `/api/auth/github`
- OAuth callback → `/api/auth/github/callback` 
- Success status display → `/api/auth/status`
- Remove integration → `/api/auth/remove`

**Data Fetching Requirements:**
- All GitHub data sync → `/api/github/sync`
- Organizations, repos, commits, pulls, issues, users → Stored via sync endpoint

**Database Storage:**
- Integration details → `github-integration` collection
- All GitHub data → Separate collections per data type

**Data Viewing Requirements:**
- Active Integrations dropdown → `/api/data/collections`
- Entity dropdown → `/api/data/collections`
- AG Grid data display → `/api/data/collection/:name`
- Dynamic columns → `/api/data/collection/:name/fields`
- Search functionality → `/api/data/search`
- Filters and pagination → Built into collection endpoint

All endpoints require JWT authentication except the initial OAuth endpoints, ensuring stateless operation as requested.