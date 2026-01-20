# Contributing to byteside

Thank you for your interest in contributing to byteside! This guide will help you get started.

## Ways to Contribute

- **Report bugs** - Open an issue describing what happened and how to reproduce it
- **Suggest features** - Share ideas for improving byteside
- **Submit code** - Fix bugs or implement new features
- **Create avatars** - Design and share custom avatars with the community
- **Improve docs** - Help make the documentation clearer and more complete

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later

### Getting Started

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/byteside.git
cd byteside

# Install dependencies
bun install

# Start the development server
bun run dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run test` | Run Vitest tests |
| `bun run lint` | Run Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |

## Project Structure

```
byteside/
├── src/              # Shared source code
│   ├── cli.ts        # CLI entry point
│   ├── config.ts     # Configuration loading
│   ├── hooks.ts      # Claude Code hooks management
│   ├── manifest.ts   # Avatar manifest validation
│   ├── avatar.ts     # Avatar discovery
│   └── types.ts      # Type definitions
├── routes/           # Nitro API endpoints
│   ├── state.get.ts  # GET /state
│   ├── state.post.ts # POST /state
│   └── _ws.ts        # WebSocket handler
├── plugins/          # Nitro plugins
├── public/           # Static files
│   ├── avatars/      # Avatar assets
│   ├── index.html    # Browser viewer
│   └── viewer.js     # Viewer JavaScript
├── tests/            # Vitest tests
└── docs/             # Documentation
```

## Code Style

byteside uses [Biome](https://biomejs.dev/) for linting and formatting with the following conventions:

- **Indentation**: Tabs
- **Quotes**: Double quotes
- **Trailing commas**: Yes
- **TypeScript**: Strict mode enabled
- **Modules**: ESM only (`"type": "module"`)

Run `bun run lint:fix` before committing to ensure your code follows the style guide.

## Submitting Changes

1. **Fork the repository** and create a branch from `main`
2. **Make your changes** and add tests if applicable
3. **Run the tests** - `bun run test`
4. **Run the linter** - `bun run lint:fix`
5. **Commit your changes** following the commit message format below
6. **Open a pull request** with a clear description of your changes

## Commit Messages

We use conventional commits format:

```
type(scope): short description

Optional longer description explaining the change in more detail.
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Build process, dependencies, etc.

**Examples:**
```
feat(cli): add --quiet flag to suppress output
fix(hooks): handle missing settings.json gracefully
docs: update avatar creation guide
```

## Creating Avatars

Want to create a custom avatar? See the [Avatar Creation Guide](docs/AVATAR_CREATION.md) for a quick start, or the [Kling Motion Control Guide](docs/KLING-MOTION-CTRL.md) for creating assets from scratch using AI tools.

## Reporting Issues

When reporting a bug, please include:

1. **byteside version** - Run `byteside --version`
2. **Operating system** - macOS, Linux, Windows
3. **Steps to reproduce** - Minimal steps to trigger the bug
4. **Expected behavior** - What should happen
5. **Actual behavior** - What actually happens
6. **Error messages** - Any console output or error messages

## License

By contributing to byteside, you agree that your contributions will be licensed under the MIT License.
