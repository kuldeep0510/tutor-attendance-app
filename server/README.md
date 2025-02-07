# WhatsApp Server for Tutor Attendance App

This server handles WhatsApp integration for the tutor attendance application, allowing automated messaging and bill sharing through WhatsApp.

## Development Setup

### Prerequisites
- Node.js 18+ installed
- NPM 9+ installed

### Environment Setup
Create a `.env` file in the server directory:

```env
# Server configuration
PORT=3005
ALLOWED_ORIGINS=http://localhost:3000
```

### Start Development Server

From the server directory, run:
```bash
npm install  # First time only
npm run dev  # This will clean WhatsApp sessions and start the server
```

The server automatically:
- Cleans old WhatsApp sessions on startup
- Enables debug logs for better issue tracking
- Uses hot-reload for development

## Production Build

```bash
npm run build  # Compile TypeScript
npm start      # Run production server
```

## Troubleshooting

If you encounter connection issues:

1. Stop the server
2. Run `npm run clean` to clear sessions
3. Restart with `npm run dev`

## Tips

- The server automatically cleans old sessions on startup
- Debug logs are enabled by default in dev mode
- Hot-reload is active during development
