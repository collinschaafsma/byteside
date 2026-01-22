# byteside

## 0.3.0

### Minor Changes

- Fix terminal renderer WebSocket support for Node.js

  - Add `ws` package for Node.js WebSocket support (WebSocket is not globally available in Node.js)
  - Use EventEmitter-style handlers for proper Node.js compatibility
  - Handle both "welcome" and "state" WebSocket messages for proper initial state sync
  - Update README to highlight ASCII art terminal mode as the default experience

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
