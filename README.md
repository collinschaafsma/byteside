# byteside

> Animated avatar companion for AI coding agents

byteside provides a visual avatar that reacts in real-time to what your AI coding assistant is doing. Watch your companion think, write code, run commands, and celebrate successes.

The default avatar ships with **animated ASCII art** that renders directly in your terminal - no browser required. Just install, run, and your AI companion comes to life in the command line.

![byteside demo](docs/byteside.gif)

![byteside terminal demo](docs/byteside-term.gif)

## What is byteside?

byteside connects to [Claude Code](https://github.com/anthropics/claude-code) via hooks to display an animated avatar that reflects the AI's current activity:

```
┌─────────────────┐     hooks      ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Claude Code   │ ──────────────>│   Nitro Server  │<───────────────>│ Browser Viewer  │
└─────────────────┘                └─────────────────┘                 └─────────────────┘
```

When Claude Code starts thinking, writing code, or running commands, byteside's hooks trigger state changes that update the avatar in your browser.

## Installation

Install byteside globally so the hooks can trigger avatar state changes:

```bash
npm install -g byteside
```

To update to the latest version:

```bash
npm update -g byteside
```

## Quick Start

Three steps to get started:

```bash
# 1. Start the byteside server
byteside

# 2. Install Claude Code hooks (in your project directory)
byteside init

# 3. Start using Claude Code - the avatar will react automatically!
```

The default avatar renders animated ASCII art directly in your terminal. When you use Claude Code, the avatar reflects what it's doing in real-time.

> **Note:** Global installation is required because Claude Code hooks run `byteside trigger <state>` commands. Using `npx byteside` to start the server won't make the `byteside` command available for hooks.

## Running Multiple Instances

byteside supports running multiple instances with different avatars for different projects. Each instance runs on its own port.

### Example: Two Projects with Different Avatars

**Project A** - using a cyberpunk avatar on port 3333:

```bash
cd ~/projects/project-a

# Create project-level config
echo '{"avatar": "cyberpunk", "server": {"port": 3333}}' > .byteside.json

# Install hooks for this project
byteside init --project

# Start the server (reads from .byteside.json)
byteside
```

**Project B** - using a minimal avatar on port 4000:

```bash
cd ~/projects/project-b

# Create project-level config
echo '{"avatar": "minimal", "server": {"port": 4000}}' > .byteside.json

# Install hooks for this project
byteside init --project

# Start the server
byteside
```

### Project vs Global Hooks

| Command | Scope | Settings File |
|---------|-------|---------------|
| `byteside init --project` | Current project only | `.claude/settings.json` |
| `byteside init --global` | All projects | `~/.claude/settings.json` |

Use **project-level hooks** when you want different avatars per project. Use **global hooks** for a single avatar across all projects.

### Quick Multi-Instance Setup

```bash
# Project-specific config
echo '{"avatar": "my-avatar", "server": {"port": 4000}}' > .byteside.json

# Install project hooks
byteside init --project

# Start server (uses .byteside.json settings)
byteside
```

## Configuration

byteside uses a layered configuration system. Settings are merged in this order (later overrides earlier):

1. **Defaults** - Built-in default values
2. **Global config** - `~/.byteside/config.json`
3. **Project config** - `.byteside.json` in current directory
4. **CLI arguments** - Flags passed to the command

### Configuration File

Create `.byteside.json` in your project root or `~/.byteside/config.json` for global settings:

```json
{
  "avatar": "default",
  "server": {
    "port": 3333,
    "host": "localhost"
  },
  "viewer": {
    "autoOpen": true,
    "showDebug": false
  },
  "avatarPaths": [
    "~/.byteside/avatars",
    "./avatars"
  ]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `avatar` | string | `"default"` | Avatar to use |
| `server.port` | number | `3333` | Server port |
| `server.host` | string | `"localhost"` | Server host |
| `viewer.autoOpen` | boolean | `true` | Auto-open browser on start |
| `viewer.showDebug` | boolean | `false` | Show debug info in viewer |
| `avatarPaths` | string[] | `["~/.byteside/avatars", "./avatars"]` | Avatar search paths |

## CLI Reference

### Main Command

```bash
byteside [options]
```

Start the byteside server.

| Option | Description |
|--------|-------------|
| `-p, --port <number>` | Port to run server on (default: 3333) |
| `-a, --avatar <name>` | Avatar to use (default: from config) |
| `--no-open` | Don't auto-open browser |
| `--no-terminal` | Disable terminal avatar rendering |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

### Commands

| Command | Description |
|---------|-------------|
| `byteside` | Start the server |
| `byteside list` | List installed avatars |
| `byteside validate <path>` | Validate an avatar package |
| `byteside init` | Install Claude Code hooks |
| `byteside trigger <state>` | Set avatar state (used by hooks) |
| `byteside hooks status` | Show hooks installation status |
| `byteside hooks uninstall` | Remove byteside hooks |
| `byteside hooks show` | Preview generated hook configuration |

### Init Command Options

```bash
byteside init [options]
```

| Option | Description |
|--------|-------------|
| `-g, --global` | Install to global settings (`~/.claude/settings.json`) |
| `-p, --project` | Install to project settings (default) |
| `-f, --force` | Overwrite existing hooks |
| `--no-backup` | Skip backup creation |

### Hooks Commands

```bash
# Check installation status
byteside hooks status [--global | --project]

# Remove hooks
byteside hooks uninstall [--global | --project | --all] [--no-backup]

# Preview hook configuration
byteside hooks show
```

## Avatar States

byteside supports 7 avatar states that reflect different AI activities:

| State | Trigger | Description |
|-------|---------|-------------|
| `idle` | Default / no activity | Relaxed, subtle animation |
| `thinking` | User submits a prompt | Contemplative, processing |
| `writing` | Edit/Write tool calls | Active coding |
| `bash` | Bash tool calls | Terminal activity |
| `error` | Errors or failures | Concerned expression |
| `success` | Task completion | Celebratory |
| `waiting` | Waiting for user input | Attentive, ready |

### Manual State Control

Test states manually with the trigger command:

```bash
byteside trigger thinking
byteside trigger writing
byteside trigger success
```

## Creating Custom Avatars

byteside avatars are directories containing a `manifest.json` and video files for each state.

### Quick Example

```
my-avatar/
├── manifest.json
├── idle.webm
├── thinking.webm
├── writing.webm
├── bash.webm
├── error.webm
├── success.webm
└── waiting.webm
```

**manifest.json:**

```json
{
  "name": "my-avatar",
  "author": "Your Name",
  "version": "1.0.0",
  "format": "webm",
  "states": {
    "idle": { "file": "idle.webm" },
    "thinking": { "file": "thinking.webm" },
    "writing": { "file": "writing.webm" },
    "bash": { "file": "bash.webm" },
    "error": { "file": "error.webm", "duration": 2000, "transition_to": "idle" },
    "success": { "file": "success.webm", "duration": 2000, "transition_to": "idle" },
    "waiting": { "file": "waiting.webm" }
  }
}
```

### Validate and Install

```bash
# Validate your avatar
byteside validate ./my-avatar

# Install to avatars directory
cp -r ./my-avatar ~/.byteside/avatars/

# Use it
byteside --avatar my-avatar
```

For detailed instructions, see the [Avatar Creation Guide](docs/AVATAR_CREATION.md).

For creating animated assets from scratch using AI tools like Midjourney and Kling, see the [Kling Motion Control Guide](docs/KLING-MOTION-CTRL.md).

## Terminal Mode

byteside supports rendering avatars directly in your terminal using ASCII art or images. **The default avatar ships with ASCII terminal support enabled**, so you get an animated terminal companion out of the box.

### Default Experience

When you run `byteside`, the default avatar displays animated ASCII art in your terminal - no configuration needed. The ASCII frames change based on what Claude Code is doing (thinking, writing, running bash commands, etc.).

### Custom Terminal Avatars

To add terminal support to your own avatar, add a `terminal` block to your avatar's `manifest.json`:

```json
{
  "name": "my-avatar",
  "terminal": {
    "enabled": true,
    "mode": "ascii",
    "framerate": 8,
    "size": { "width": 40, "height": 20 },
    "states": {
      "idle": { "frames": ["terminal/idle/01.txt", "terminal/idle/02.txt"] },
      "thinking": { "frames": ["terminal/thinking/01.txt"] }
    }
  }
}
```

When `terminal.enabled` is `true`, byteside renders the avatar in your terminal instead of opening a browser window.

### Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `ascii` | Animated ASCII art frames | Universal compatibility, retro aesthetic |
| `image` | Inline images | iTerm2, Kitty, WezTerm |

### Using Browser Mode Instead

If you prefer the browser viewer over terminal ASCII art:

```bash
byteside --no-terminal
```

This opens a browser window with the full video-based avatar instead of terminal rendering.

For complete instructions on creating terminal avatars, see the [Terminal Avatar Guide](docs/TERMINAL_AVATAR.md).

## API Reference

byteside exposes a simple HTTP/WebSocket API for state management.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/state` | GET | Get current avatar state |
| `/state` | POST | Update avatar state |
| `/_ws` | WebSocket | Real-time state updates |

### GET /state

Returns the current avatar state.

**Response:**
```json
{
  "state": "thinking"
}
```

### POST /state

Update the avatar state.

**Request:**
```json
{
  "state": "writing"
}
```

**Valid states:** `idle`, `thinking`, `writing`, `bash`, `error`, `success`, `waiting`

### WebSocket

Connect to `ws://localhost:3333/_ws` for real-time updates.

**Welcome message on connect:**
```json
{
  "type": "welcome",
  "state": "idle"
}
```

**State change broadcasts:**
```json
{
  "type": "state",
  "state": "thinking"
}
```

## Troubleshooting

### Avatar not responding to Claude Code

1. **Check hooks are installed:**
   ```bash
   byteside hooks status
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:3333/state
   ```

3. **Test manual trigger:**
   ```bash
   byteside trigger thinking
   ```

### Port already in use

Another instance may be running. Either stop it or use a different port:

```bash
byteside --port 4000
```

### Avatar not found

Ensure the avatar is in one of the configured paths:
- `~/.byteside/avatars/`
- `./avatars/` (relative to current directory)

List available avatars:

```bash
byteside list
```

### Hooks not triggering

Reinstall with force flag:

```bash
byteside init --force
```

Check Claude Code is using the correct settings file. Project hooks are in `.claude/settings.json` in your project directory.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
