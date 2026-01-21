# byteside
## Tasks & Roadmap

---

## Milestone 1: Core Infrastructure
**Goal:** Server runs, viewer displays, state updates work

### 1.1 Project Setup
- [ ] Initialize npm package (`byteside`)
- [ ] Set up Nitro project structure
- [ ] Configure TypeScript
- [ ] Set up Biome
- [ ] Create basic README

### 1.2 Nitro Server - Basic
- [ ] Create `server/routes/index.get.ts` — serve viewer HTML
- [ ] Create `server/routes/state.get.ts` — return current state
- [ ] Create `server/routes/state.post.ts` — update state
- [ ] Create `server/plugins/state.ts` — in-memory state manager
- [ ] Add CORS headers for local development
- [ ] Test with curl

### 1.3 WebSocket Integration
- [ ] Enable experimental WebSocket in Nitro config
- [ ] Create `server/routes/_ws.ts` — WebSocket handler
- [ ] Broadcast state changes to connected clients
- [ ] Handle client connect/disconnect
- [ ] Test with wscat or browser console

### 1.4 Basic Viewer
- [ ] Create `public/index.html` — viewer shell
- [ ] Create `public/viewer.js` — vanilla JS viewer logic
- [ ] Connect to WebSocket
- [ ] Display current state (text only first)
- [ ] Handle state change messages
- [ ] Basic styling

---

## Milestone 2: Avatar System
**Goal:** Load and display avatar video files

### 2.1 Avatar Manifest
- [ ] Define manifest schema (TypeScript types)
- [ ] Create manifest parser/validator
- [ ] Handle JSON format
- [ ] Validate required states exist
- [ ] Validate file references

### 2.2 Default Avatar
- [ ] Create placeholder videos (can be simple/geometric)
- [ ] Create manifest.json for default avatar
- [ ] Place in `avatars/default/`
- [ ] Test loading

### 2.3 Avatar Loading
- [ ] Create `server/routes/avatars/[name]/[...path].get.ts` — serve avatar files
- [ ] Create `server/routes/api/avatars.get.ts` — list avatars
- [ ] Load avatar manifest on server start
- [ ] Serve manifest to viewer

### 2.4 Video Playback
- [ ] Preload all state videos in viewer
- [ ] Display current state video
- [ ] Loop videos by default
- [ ] Handle `transition_to` for one-shot states
- [ ] Crossfade between states

---

## Milestone 3: CLI & Configuration
**Goal:** Usable CLI, configuration files work

### 3.1 CLI Setup
- [ ] Set up CLI entry point with `#!/usr/bin/env node`
- [ ] Add to package.json `bin` field
- [ ] Parse command line arguments (use `commander`)
- [ ] Implement `byteside` (start server)
- [ ] Implement `byteside --port <n>`
- [ ] Implement `byteside --avatar <name>`
- [ ] Auto-open browser on start

### 3.2 Configuration
- [ ] Define config schema
- [ ] Load global config from `~/.byteside/config.json`
- [ ] Load project config from `.byteside.json`
- [ ] Merge configs with CLI args (CLI wins)
- [ ] Create default config on first run

### 3.3 Avatar Management
- [ ] Create `~/.byteside/avatars/` directory structure
- [ ] Implement `byteside list` — show installed avatars
- [ ] Implement `byteside validate <path>` — validate avatar package
- [ ] Copy default avatar to user directory on first run

---

## Milestone 4: Claude Code Integration
**Goal:** Works end-to-end with Claude Code

### 4.1 Hook Configuration
- [ ] Document hook setup in README
- [ ] Create example `.claude/settings.json`
- [ ] Test PreToolUse hooks (thinking, writing, bash)
- [ ] Test PostToolUse hooks (idle)
- [ ] Handle rapid state changes gracefully

### 4.2 State Mapping
- [ ] Define recommended state mappings for Claude Code events
- [ ] Document which tools map to which states
- [ ] Handle edge cases (unknown states default to idle)

### 4.3 End-to-End Testing
- [ ] Test full flow: start server → open viewer → use Claude Code
- [ ] Verify state transitions are smooth
- [ ] Test error state handling
- [ ] Test success state handling
- [ ] Performance check (no lag on state changes)

---

## Milestone 5: Polish & Release
**Goal:** Ready for public use

### 5.1 Documentation
- [ ] Complete README with install instructions
- [ ] Add GIF/video demo
- [ ] Document configuration options
- [ ] Document avatar creation workflow
- [ ] Create CONTRIBUTING.md
- [ ] Create avatar creation guide (link to asset guide)

### 5.2 Default Avatar (Real)
- [ ] Generate character using Midjourney/FLUX
- [ ] Record reference videos for all states
- [ ] Process through Kling motion transfer
- [ ] Post-process into seamless loops
- [ ] Convert to WebM
- [ ] Package as default avatar

### 5.3 Error Handling
- [ ] Handle server start failures gracefully
- [ ] Handle missing avatar gracefully
- [ ] Handle WebSocket disconnection/reconnection
- [ ] Handle malformed state updates
- [ ] User-friendly error messages

### 5.4 Release Prep
- [ ] Clean up code
- [ ] Add license (MIT)
- [ ] Version 0.1.0
- [ ] Publish to npm
- [ ] Create GitHub release
- [ ] Announce (Twitter, Reddit, etc.)

---

## Milestone 6: Community Features (Post-MVP)
**Goal:** Enable avatar ecosystem

### 6.1 Avatar Installation
- [ ] Implement `byteside install <npm-package>`
- [ ] Implement `byteside install <git-url>`
- [ ] Implement `byteside install <local-path>`
- [ ] Handle dependencies/versions

### 6.2 Avatar Creation
- [ ] Implement `byteside create <name>` — scaffold new avatar
- [ ] Generate manifest template
- [ ] Create placeholder files
- [ ] Validate on creation

### 6.3 Gallery (Future)
- [ ] Design gallery website
- [ ] Avatar submission flow
- [ ] Preview/demo capability
- [ ] Search/filter avatars

---

## File Structure (Target)

```
byteside/
├── package.json
├── tsconfig.json
├── nitro.config.ts
├── README.md
├── LICENSE
│
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── config.ts              # Config loading
│   └── types.ts               # Shared types
│
├── server/
│   ├── routes/
│   │   ├── index.get.ts       # Serve viewer
│   │   ├── state.get.ts       # GET /state
│   │   ├── state.post.ts      # POST /state
│   │   ├── _ws.ts             # WebSocket handler
│   │   ├── api/
│   │   │   └── avatars.get.ts # List avatars
│   │   └── avatars/
│   │       └── [...path].get.ts # Serve avatar files
│   │
│   └── plugins/
│       └── state.ts           # State manager
│
├── public/
│   ├── index.html             # Viewer HTML
│   ├── viewer.js              # Viewer logic
│   └── styles.css             # Viewer styles
│
├── avatars/
│   └── default/
│       ├── manifest.yaml
│       ├── preview.png
│       ├── idle.webm
│       ├── thinking.webm
│       ├── writing.webm
│       ├── bash.webm
│       ├── error.webm
│       ├── success.webm
│       └── waiting.webm
│
└── docs/
    ├── ASSET_GUIDE.md         # Avatar creation guide
    └── HOOKS.md               # Claude Code hook setup
```

---

## Dependencies

### Runtime
- `nitro` — Server framework
- `commander` — CLI argument parsing (UnJS)
- `@opentui` — TUI
- `open` — Open browser

### Development
- `typescript`
- `@types/node`
- `biome`

---

## Quick Start Commands

```bash
# Development
bun run dev          # Start Nitro dev server with HMR

# Build
bun run build        # Build for production

# Preview
bun run preview      # Preview production build

# CLI (local)
bun link             # Link for local CLI testing
byteside             # Run CLI
```

---

## State Machine

```
                    ┌─────────┐
                    │  idle   │◄─────────────────┐
                    └────┬────┘                  │
                         │                       │
         ┌───────────────┼───────────────┐       │
         │               │               │       │
         ▼               ▼               ▼       │
    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
    │thinking │    │ writing │    │  bash   │   │
    └────┬────┘    └────┬────┘    └────┬────┘   │
         │               │               │       │
         └───────────────┴───────────────┘       │
                         │                       │
                         ▼                       │
                    (on complete)────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────┐                    ┌─────────┐
    │  error  │                    │ success │
    └────┬────┘                    └────┬────┘
         │                               │
         │      transition_to: idle      │
         └───────────────┬───────────────┘
                         │
                         ▼
                    ┌─────────┐
                    │  idle   │
                    └─────────┘


    ┌─────────┐
    │ waiting │  (user input needed)
    └─────────┘
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket flaky in some environments | High | Fallback to polling, good reconnection logic |
| Large avatar files slow to load | Medium | Recommend file size limits, lazy loading |
| Claude Code hooks change | Medium | Abstract hook config, document clearly |
| npm name taken | Low | Already verified `byteside` is available |
| Nitro WebSocket still experimental | Medium | It's been stable, fallback plan exists |

---

## Done Criteria (MVP)

- [ ] `npx byteside` starts server and opens viewer
- [ ] Default avatar displays and loops
- [ ] Claude Code hooks update state correctly
- [ ] All 7 states work (idle, thinking, writing, bash, error, success, waiting)
- [ ] State transitions are smooth (crossfade)
- [ ] One-shot states (error, success) auto-return to idle
- [ ] README documents setup clearly
- [ ] Published to npm
- [ ] Works on macOS (primary), Linux, Windows (best effort)
