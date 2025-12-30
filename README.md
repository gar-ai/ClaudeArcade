# ClaudeArcade

An RPG-style inventory management system for Claude Code extensions. ClaudeArcade gamifies the Claude Code configuration experience, allowing you to manage MCP servers, commands, skills, hooks, and more through an intuitive equipment-based interface.

![ClaudeArcade](public/ClaudeArcade.png)

## Features

### Equipment System

- **Helm (System Prompt)** - Your Claude Code persona and system instructions
- **Mainhand & Offhand (MCP Servers)** - Primary and secondary MCP server configurations
- **Hooks** - Pre/post command hooks for automation
- **Rings (Memory)** - Context and memory configurations
- **Spellbook (Skills)** - Slash commands and skills
- **Companions (Subagents)** - Agent configurations
- **Trinkets (Commands)** - Custom commands

### Party System

- Manage multiple Claude instances as "party members"
- Assign different loadouts to different agents
- Configure project-specific contexts per party member

### Project Registry

- Auto-register projects when opened
- Scan `.claude` folders for commands, skills, agents, and hooks
- Quick project switching with metadata display
- Tag and organize projects

### Build Profiles

- Save equipment configurations as builds
- Quick-swap between different setups
- Preset builds for common configurations

### Workflow Editor

- Visual workflow creation
- Connect commands and skills
- Automate complex operations

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
# Clone the repository
git clone https://github.com/gar-ai/ClaudeArcade.git
cd ClaudeArcade

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Architecture

### Frontend (React + TypeScript)

```text
src/
├── components/
│   ├── agents/         # Agent Manager UI
│   ├── builds/         # Build profiles management
│   ├── inventory/      # Equipment slots and inventory
│   ├── layout/         # App layout components
│   ├── modals/         # Modal dialogs
│   ├── party/          # Party member management
│   ├── project/        # Project picker and manager
│   ├── updates/        # Update checker
│   └── workflow/       # Workflow editor
├── stores/             # Zustand state management
│   ├── appStore.ts         # Main app state
│   ├── buildStore.ts       # Build profiles
│   ├── personaStore.ts     # Theme/persona
│   ├── projectStore.ts     # Current project
│   ├── projectRegistryStore.ts  # Registered projects
│   └── workflowStore.ts    # Workflow state
└── types/              # TypeScript definitions
```

### Backend (Rust + Tauri)

```text
src-tauri/
├── src/
│   ├── commands/
│   │   ├── inventory.rs    # Inventory scanning
│   │   ├── party.rs        # Party management
│   │   ├── project.rs      # Project scanning
│   │   └── settings.rs     # Settings management
│   ├── lib.rs              # Command registration
│   └── main.rs             # Entry point
└── tauri.conf.json         # Tauri configuration
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + 1` | Switch to Backpack view |
| `Cmd/Ctrl + 2` | Switch to Terminal view |
| `Cmd/Ctrl + 3` | Switch to Split view |
| `Cmd/Ctrl + 4` | Switch to Party view |
| `Cmd/Ctrl + P` | Toggle Project Picker |
| `Cmd/Ctrl + Shift + P` | Open Project Manager |
| `Cmd/Ctrl + Shift + A` | Open Agent Manager |
| `Cmd/Ctrl + W` | Toggle Workflow Editor |
| `Escape` | Close current modal/dialog |

## Configuration

ClaudeArcade reads and writes to the Claude Code configuration directories:

- **Global**: `~/.claude/` (macOS/Linux) or `%USERPROFILE%\.claude\` (Windows)
- **Project**: `./.claude/` in your project root

### Supported Items

- `settings.json` - Claude Code settings including MCP servers and hooks
- `CLAUDE.md` - System prompt / persona
- `commands/*.md` - Custom commands
- `skills/*.md` - Skill definitions
- `agents/*.md` - Subagent configurations

## Development

### Running Tests

```bash
npm run test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building

```bash
# Development build
npm run tauri dev

# Production build
npm run tauri build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [React](https://react.dev/) and [TailwindCSS](https://tailwindcss.com/)
- State management with [Zustand](https://github.com/pmndrs/zustand)
- Designed for [Claude Code](https://claude.ai/)
