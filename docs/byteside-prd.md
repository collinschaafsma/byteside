# byteside
## Product Requirements Document

**Version:** 0.1.0  
**Status:** Draft  
**Author:** Collin  

---

## Overview

byteside is an open-source animated avatar companion system for AI coding agents. It displays animated characters that react in real-time to agent activities, providing ambient visual feedback during AI-assisted coding sessions.

### Vision

Transform the cold terminal experience into something more engaging by giving AI coding agents a visual presence. When Claude Code reads a file, your avatar looks thoughtful. When it writes code, the avatar focuses. When something fails, it reacts. When it succeeds, it celebrates.

### Goals

1. **Delightful developer experience** — Make AI coding sessions more engaging
2. **Community-driven content** — Enable anyone to create and share avatar packs
3. **Zero friction setup** — `npx byteside` and you're running
4. **Aesthetic agnostic** — Support any visual style (cyberpunk, anime, pixel art, minimal, etc.)

### Non-Goals

- Not a replacement for terminal output
- Not a chat interface
- Not tied to any specific AI coding tool (though Claude Code is primary target)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Hooks (PreToolUse, PostToolUse, etc.)              │    │
│  │  ───────────────────────────────────────────────────│    │
│  │  POST /state { state: "thinking" }                  │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   byteside Server (Nitro)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ POST /state │  │ GET /state  │  │ WebSocket /_ws      │  │
│  │ Update      │  │ Current     │  │ Real-time broadcast │  │
│  └──────┬──────┘  └─────────────┘  └──────────┬──────────┘  │
│         │                                      │             │
│         ▼                                      │             │
│  ┌─────────────────────────────────────────────┘             │
│  │ State Manager (in-memory)                                 │
│  │ { currentState: "thinking", avatar: "default", ... }     │
│  └───────────────────────────────────────────────────────────│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Static Assets: /avatars/:name/*                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Browser Viewer                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  <video> element showing current state loop             ││
│  │  Receives state changes via WebSocket                   ││
│  │  Crossfades between state videos                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Nitro Server

Lightweight server that:
- Receives state updates from hooks (POST /state)
- Broadcasts state changes to connected viewers (WebSocket)
- Serves avatar assets (video files, manifest)
- Serves the viewer HTML/JS

**Tech:** Nitro (nitro.build) — chosen for:
- Native WebSocket support
- Filesystem routing
- Tiny output (<1MB)
- Deploy anywhere (Node, Bun, Deno)
- TypeScript native
- HMR in development

**Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Serve viewer HTML |
| `/state` | GET | Get current state |
| `/state` | POST | Update state (from hooks) |
| `/_ws` | WS | Real-time state broadcast |
| `/avatars/:name/*` | GET | Serve avatar assets |
| `/api/avatars` | GET | List available avatars |

### 2. Browser Viewer

Single-page app that displays the avatar:
- Connects to server via WebSocket
- Preloads all state videos on init
- Crossfades between states on change
- Respects `transition_to` for one-shot states (error, success)
- Optionally shows state name for debugging

**Tech:** Vanilla JS or lightweight framework (Preact/Solid)
- No build step required for basic viewer
- Can be opened in browser or embedded

### 3. Claude Code Hook

Configuration for Claude Code to send state updates:

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Grep|Glob",
        "command": "curl -X POST http://localhost:3333/state -d '{\"state\":\"thinking\"}'"
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "command": "curl -X POST http://localhost:3333/state -d '{\"state\":\"writing\"}'"
      },
      {
        "matcher": "Bash",
        "command": "curl -X POST http://localhost:3333/state -d '{\"state\":\"bash\"}'"
      }
    ],
    "PostToolUse": [
      {
        "command": "curl -X POST http://localhost:3333/state -d '{\"state\":\"idle\"}'"
      }
    ]
  }
}
```

### 4. Avatar Packages

Distributable bundles containing:
- Manifest file (YAML or JSON)
- Video files for each state (WebM recommended)
- Preview image
- README with credits

**Manifest schema:**

```yaml
name: string           # Package name (kebab-case)
author: string         # Creator name/handle
version: string        # Semver
format: string         # Video format (webm, mp4)
resolution: string     # e.g., "512x512"
framerate: number      # e.g., 24
loop: boolean          # Default loop behavior

states:
  [stateName]:
    file: string       # Filename
    duration: number   # Duration in ms
    transition_to?: string  # Auto-transition after playing

palette?:              # Optional UI colors
  primary: string
  secondary: string
  success: string
  error: string
  background: string
```

**Required states:**
- `idle` — Default/resting state
- `thinking` — Reading, analyzing
- `writing` — Creating/editing files
- `bash` — Running commands
- `error` — Something went wrong
- `success` — Task completed
- `waiting` — Waiting for user input

---

## User Flows

### Flow 1: First Run

```
1. User runs: npx byteside
2. Server starts on localhost:3333
3. Browser opens to viewer
4. Default avatar loads with "idle" state
5. User sees avatar breathing/blinking
```

### Flow 2: During Coding Session

```
1. User asks Claude Code to edit a file
2. Claude Code PreToolUse hook fires
3. Hook sends POST /state { state: "writing" }
4. Server broadcasts state change via WebSocket
5. Viewer receives change, crossfades to "writing" video
6. Claude Code completes edit
7. PostToolUse hook fires, sends { state: "idle" }
8. Viewer crossfades back to idle
```

### Flow 3: Error State

```
1. Claude Code encounters an error
2. Hook sends POST /state { state: "error" }
3. Viewer plays "error" video once
4. Manifest specifies transition_to: "idle"
5. After error video completes, auto-transitions to idle
```

### Flow 4: Switching Avatars

```
1. User runs: byteside --avatar cyberpunk-kai
2. Server loads avatar from ~/.byteside/avatars/cyberpunk-kai/
3. Viewer shows new avatar
```

### Flow 5: Installing Community Avatar

```
1. User finds avatar on npm or gallery
2. User runs: byteside install @someone/cool-avatar
3. Avatar downloaded to ~/.byteside/avatars/
4. User runs: byteside --avatar cool-avatar
```

---

## CLI Interface

```bash
# Start server with default avatar
byteside

# Start with specific avatar
byteside --avatar cyberpunk-kai

# Start on different port
byteside --port 4000

# List installed avatars
byteside list

# Install avatar from npm
byteside install @username/avatar-name

# Install avatar from local path
byteside install ./my-avatar

# Create new avatar scaffold
byteside create my-new-avatar

# Validate avatar package
byteside validate ./my-avatar

# Open viewer without starting server (connect to existing)
byteside view --server http://localhost:3333
```

---

## Configuration

### Global Config (~/.byteside/config.yaml)

```yaml
# Default avatar to use
defaultAvatar: "default"

# Server settings
server:
  port: 3333
  host: "localhost"

# Viewer settings  
viewer:
  autoOpen: true
  showDebug: false
  
# Avatar search paths
avatarPaths:
  - "~/.byteside/avatars"
  - "./avatars"
```

### Per-Project Config (.byteside.yaml)

```yaml
# Override avatar for this project
avatar: "project-mascot"

# Override port
port: 3334
```

---

## API Reference

### POST /state

Update the current avatar state.

**Request:**
```json
{
  "state": "thinking"
}
```

**Response:**
```json
{
  "ok": true,
  "state": "thinking",
  "previous": "idle"
}
```

**Valid states:** idle, thinking, writing, bash, error, success, waiting

### GET /state

Get the current state.

**Response:**
```json
{
  "state": "thinking",
  "avatar": "default",
  "since": "2025-01-19T12:00:00Z"
}
```

### WebSocket /_ws

Real-time state updates.

**Server → Client messages:**
```json
{
  "type": "state",
  "state": "writing",
  "previous": "thinking"
}
```

```json
{
  "type": "avatar",
  "avatar": "cyberpunk-kai"
}
```

**Client → Server messages:**
```json
{
  "type": "ping"
}
```

### GET /api/avatars

List available avatars.

**Response:**
```json
{
  "avatars": [
    {
      "name": "default",
      "author": "byteside",
      "version": "1.0.0",
      "path": "/avatars/default"
    }
  ],
  "current": "default"
}
```

---

## Default Avatar

byteside ships with a simple default avatar:
- Minimal/geometric style
- Works for any aesthetic preference
- Demonstrates all required states
- Serves as reference implementation

The default avatar should be:
- Visually neutral (not strongly themed)
- Small file size
- High quality example of the spec

---

## Success Metrics

### Adoption
- GitHub stars
- npm weekly downloads
- Community avatars created

### Engagement
- Average session length
- Number of state changes per session
- Avatar installs

### Community
- Avatar submissions
- Gallery traffic
- Discord/community activity

---

## Future Considerations

### Phase 2 Features (not in MVP)
- Avatar gallery website
- In-viewer avatar switching
- Sound effects (optional)
- Multiple simultaneous viewers
- Avatar marketplace
- Integration with other AI coding tools (Cursor, Copilot, etc.)
- Custom state definitions per avatar

### Technical Debt to Avoid
- Don't over-engineer state management
- Keep viewer simple (no heavy frameworks)
- Avoid breaking manifest schema changes
- Keep server stateless where possible

---

## Open Questions

1. **Avatar distribution** — npm packages vs. git repos vs. dedicated registry?
2. **State extensibility** — Should avatars be able to define custom states?
3. **Multi-agent** — Support for multiple agents with different avatars?
4. **Persistence** — Should state persist across server restarts?
5. **Analytics** — Any telemetry (opt-in)?

---

## Timeline

See TASKS.md for detailed breakdown.

**Target:** MVP in ~2-3 weeks of focused work
