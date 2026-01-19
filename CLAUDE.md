# Notion iCal Calendar

## Project Overview
Node.js application that connects to a Notion database containing calendar events and exposes them as an iCal feed.

## Architecture Decisions

### Framework Choice
- **Native Node.js HTTP** - Minimal dependencies, sufficient for a simple REST endpoint

### Dependencies (Production)
- `@notionhq/client` - Official Notion SDK (required)
- `ical-generator` - Lightweight iCal generation library

### Dependencies (Development)
- `typescript` - Type safety
- `@types/node` - Node.js type definitions
- `tsx` - TypeScript execution for development

### Project Structure
```
src/
├── index.ts        # Entry point, starts server
├── config.ts       # Environment configuration
├── notion.ts       # Notion client and event fetching
├── calendar.ts     # iCal generation from Notion events
└── server.ts       # HTTP server setup
```

### Notion Database Requirements
The Notion database should contain:
- A **Date** property (for event start/end dates)
- A **Title** property (event name)
- Optional: Description, Location properties

### Environment Variables
- `NOTION_API_KEY` - Notion integration token
- `NOTION_DATABASE_ID` - ID of the calendar database
- `PORT` - Server port (default: 3000)
- `CACHE_TTL` - Cache duration in seconds (default: 300)
- `NOTION_PROPERTY_TITLE` - Property name for event title (default: "Name")
- `NOTION_PROPERTY_DATE` - Property name for event date (default: "Date")
- `NOTION_PROPERTY_DESCRIPTION` - Property name for description (optional)
- `NOTION_PROPERTY_LOCATION` - Property name for location (optional)

## Development Commands
```bash
pnpm install        # Install dependencies
pnpm dev            # Run in development mode
pnpm build          # Build for production
pnpm start          # Run production build
pnpm lint           # Run linter
pnpm test           # Run tests
```

## Docker
- Multi-stage build for minimal image size
- Distroless Node.js base image for security
- Non-root user execution
