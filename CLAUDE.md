# byteside - Claude Code Context

## Project Overview

byteside is an animated avatar companion for AI coding agents. It provides a visual representation of what the AI is doing in real-time through a browser-based viewer that syncs with Claude Code via hooks.

## Architecture

```
┌─────────────────┐     hooks      ┌─────────────────┐     WebSocket    ┌─────────────────┐
│   Claude Code   │ ──────────────▶│   Nitro Server  │◀────────────────▶│ Browser Viewer  │
└─────────────────┘                └─────────────────┘                  └─────────────────┘
```

- **Nitro Server**: HTTP/WebSocket server managing avatar state
- **Browser Viewer**: Displays animated avatar (CSS/Lottie)
- **Hooks Integration**: Claude Code hooks trigger state changes

## Directory Structure

```
byteside/
├── src/              # Shared source code
│   └── types.ts      # Type definitions (AvatarState, WsMessage, etc.)
├── routes/           # API endpoints
│   ├── state.get.ts  # GET /state
│   ├── state.post.ts # POST /state
│   └── _ws.ts        # WebSocket handler
├── plugins/          # Nitro plugins
│   ├── state.ts      # State management with pub/sub
│   └── cors.ts       # CORS configuration
├── tests/            # Vitest tests
├── public/           # Static files served by Nitro
├── avatars/          # Avatar assets and animations
├── nitro.config.ts   # Nitro configuration
├── tsconfig.json     # TypeScript config (strict mode)
└── biome.json        # Linter/formatter config
```

## Key Commands

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run preview  # Preview production build
bun run test     # Run Vitest tests
bun run lint     # Run Biome linter
bun run lint:fix # Auto-fix lint issues
```

## Coding Conventions

- **TypeScript**: Strict mode enabled with additional safety flags
- **Formatting**: Biome with tabs, double quotes, trailing commas
- **Modules**: ESM only (`"type": "module"`)

## Avatar State System

The avatar has 7 possible states:

| State      | Trigger                        | Visual                    |
|------------|--------------------------------|---------------------------|
| `idle`     | Default / no activity          | Relaxed, subtle animation |
| `thinking` | Before tool calls              | Contemplative             |
| `writing`  | Edit/Write tool calls          | Active coding             |
| `bash`     | Bash tool calls                | Terminal activity         |
| `error`    | Errors or failures             | Concerned                 |
| `success`  | Task completion                | Celebratory               |
| `waiting`  | Waiting for user input         | Attentive                 |

## API Endpoints

- `GET /state` - Get current avatar state
- `POST /state` - Update avatar state
- `WS /_ws` - WebSocket for real-time updates (sends welcome message on connect, broadcasts state changes)

## Documentation

- PRD: `docs/prd.md`
- Tasks: `docs/tasks.md`
