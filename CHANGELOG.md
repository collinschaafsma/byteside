# byteside

## 0.2.0

### Minor Changes

- Add custom avatar serving and fix config loading

  - Add dynamic route to serve avatars from user directories (~/.byteside/avatars/)
  - Fix config loading to properly read from ~/.byteside/config.json
  - Add runtime config for avatar in nitro.config.ts
  - Simplify viewer styling (black background, minimal state label)
  - Add tests for avatar route and config loading

## 0.1.0

### Minor Changes

- Initial release - Animated avatar companion for AI coding agents

  - CLI tool to start the avatar server (`npx byteside`)
  - Browser-based viewer with WebSocket sync
  - Terminal-based ASCII art rendering
  - Claude Code hooks integration for real-time state changes
  - 7 avatar states: idle, thinking, writing, bash, error, success, waiting
  - Default avatar included with video and terminal animations
  - Cross-platform support (macOS, Linux, Windows)
  - Node.js 18+ compatibility
