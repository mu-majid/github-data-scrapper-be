# Backend API Endpoints Summary

## How to Run it:
- Run `npm install`
- Make sure you have Docker installed
- make sure you set up the `.env` and `.env.docker` files properly
- open a terminal in the project's directory, then run `make build`
- then run `make up` to spin up the app and mongo
- OR run `make tools` to spin up the app, mongo and mongo-express which is a GUI for mongo (localhost:8081).

- .env
```sh
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/integrations

JWT_SECRET=asd12345

GITHUB_CLIENT_ID=Ov23liiejBNFsbBp7Trp
GITHUB_CLIENT_SECRET=1ab3761ac5bf717134c12da2d8022ae1f3ad66f7
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

FRONTEND_URL=http://localhost:4200
```
- .env.docker
```sh
NODE_ENV=production

MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123
MONGO_DATABASE=integrations

JWT_SECRET=asd12345

GITHUB_CLIENT_ID=Ov23liiejBNFsbBp7Trp
GITHUB_CLIENT_SECRET=1ab3761ac5bf717134c12da2d8022ae1f3ad66f7
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

FRONTEND_URL=http://localhost:4200

MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=admin123
```

## Future enhancements and improvements:
- Input validation and sanitization (Joi, ajv, ...)
- Better logging for tracing the operations on the server.
- Central Error Handling (semi-exists now), with custom business-domain errors
- Using Typescript for proper typing.
- Enhancing the sync endpoint:
    - Idea-1: Use stream pipelines 
    - Idea-2: Fire and Forget endpoint and notify the client when done / client would long-poll the server.
- Add testing (unit, integrations, e2e)

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
| `/sync-jupyter` | POST | Runs a Test Sync against Jupyter org | Testing Purposes |


## Data Management (`/api/data`)

| Endpoint | Method | Purpose | Requirement Served |
|----------|--------|---------|-------------------|
| `/collections` | GET | Get list of available collections with counts | Populate "Entity Dropdown" with collections |
| `/collection/:name` | GET | Get paginated data from specific collection | Display data in AG Grid table |
| `/collection/:name/fields` | GET | Get field definitions for AG Grid columns | Dynamic column setup for AG Grid |

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
- Search functionality → `/api/data/collection/:name +  searchQuery` (On a diff branch there a functionality for search across all collections)
- Filters and pagination → Built into collection endpoint

All endpoints require JWT authentication except the initial OAuth endpoints, ensuring stateless operation as requested.