# Notion iCal Calendar

A Node.js application that connects to a Notion database containing calendar events and exposes them as an iCal feed. Subscribe to the feed URL in any calendar application (Google Calendar, Apple Calendar, Outlook, etc.) to sync your Notion events.

## Prerequisites

- Node.js 20+
- pnpm
- A Notion integration with access to your database

## Notion Setup

1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Copy the integration token (this will be your `NOTION_API_KEY`)
3. Share your database with the integration
4. Copy your database ID from the database URL (the part after the workspace name and before the `?`)

### Database Requirements

Your Notion database should have:
- A **Title** property (default name: "Name") for event names
- A **Date** property (default name: "Date") for event dates
- Optional: A **Rich Text** property for descriptions
- Optional: A **Rich Text** property for locations

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NOTION_API_KEY` | Yes | - | Notion integration token |
| `NOTION_DATABASE_ID` | Yes | - | Target database ID |
| `PORT` | No | 3000 | HTTP server port |
| `CACHE_TTL` | No | 300 | Cache duration in seconds |
| `NOTION_PROPERTY_TITLE` | No | "Name" | Property name for event title |
| `NOTION_PROPERTY_DATE` | No | "Date" | Property name for event date |
| `NOTION_PROPERTY_DESCRIPTION` | No | - | Property name for description |
| `NOTION_PROPERTY_LOCATION` | No | - | Property name for location |

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode (with hot reload)
pnpm dev

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Build for production
pnpm build

# Run production build
pnpm start
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/calendar.ics` | Returns the iCal feed |
| GET | `/health` | Health check (returns 200 OK) |

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t notion-ical-calendar .

# Run container
docker run -p 3000:3000 \
  -e NOTION_API_KEY=your_api_key \
  -e NOTION_DATABASE_ID=your_database_id \
  notion-ical-calendar
```

## Subscribing to the Calendar

Once the server is running, you can subscribe to the calendar in your favorite calendar application:

- **Google Calendar**: Settings > Add calendar > From URL > paste `http://your-server:3000/calendar.ics`
- **Apple Calendar**: File > New Calendar Subscription > paste the URL
- **Outlook**: Add calendar > Subscribe from web > paste the URL

## License

MIT
