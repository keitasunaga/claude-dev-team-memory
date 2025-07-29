# MCP Memory Server for Claude Code

A Model Context Protocol (MCP) server that provides persistent memory management for Claude Code development sessions. This server solves the problem of context loss during long development sessions by maintaining both global user preferences and project-specific memory across sessions.

## 🎯 Purpose

- **Problem**: Claude Code loses memory (context) during long-running sessions
- **Solution**: MCP server provides persistent memory management with dual-database architecture

## ✨ Features

### 1. Global Memory (User Level)
- Development preferences (e.g., "use pnpm", "prefer TypeScript")
- Communication settings (e.g., "respond in Japanese")
- Common development patterns and styles
- Persists across all projects

### 2. Project Memory (Project Specific)
- Issue context with requirements and design decisions
- Task lists with status tracking
- Development checkpoints for session restoration
- Session state including branch and modified files
- Auto-save functionality with configurable triggers

## 📦 Installation

### Quick Install (macOS/Linux)

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# Run the installation script
chmod +x scripts/install.sh
./scripts/install.sh
```

The installation script will:
1. Install dependencies
2. Build the project
3. Set up directory structure
4. Configure Claude Desktop automatically
5. Create initial configuration

### Manual Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Create directory structure
mkdir -p ~/.claude/mcp-memory/{global,projects,backups,logs}

# Copy built files
cp -r dist ~/.claude/mcp-memory/
cp package.json ~/.claude/mcp-memory/
cp -r node_modules ~/.claude/mcp-memory/
```

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["~/.claude/mcp-memory/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_MEMORY_CONFIG": "~/.claude/mcp-memory/config.json"
      }
    }
  }
}
```

## 🛠️ Usage

### Available MCP Tools

The server exposes these tools to Claude:

- `save_global_preference` - Save a global preference
- `get_global_preference` - Retrieve global preferences
- `save_project_context` - Save project-specific context
- `get_project_context` - Retrieve project context
- `save_issue_context` - Save current issue details
- `save_tasks` - Save task list
- `save_session_state` - Save current session state
- `create_checkpoint` - Create a development checkpoint
- `list_checkpoints` - List available checkpoints
- `restore_checkpoint` - Restore from a checkpoint
- `health` - Check server health status

### Example Usage in Claude

```
"Remember that I prefer pnpm over npm"
"Save the current issue context"
"Create a checkpoint before refactoring"
"What was I working on in this project?"
"Restore from the last checkpoint"
```

### Development Workflow

1. **Starting a new issue**:
   - Claude automatically retrieves previous project context
   - Issue requirements and design decisions are loaded
   - Task list is restored from last session

2. **During development**:
   - Auto-save triggers on task completion and test passes
   - Manual checkpoints can be created at any time
   - Session state is continuously updated

3. **After context reset**:
   - Previous state is automatically restored
   - Work continues from last checkpoint
   - No manual context rebuilding needed

## 📁 Project Structure

```
mcp-memory-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server/               # MCP server implementation
│   ├── services/             # Core services
│   │   ├── MemoryManager.ts  # Memory management logic
│   │   ├── CheckpointManager.ts # Checkpoint functionality
│   │   └── AutoSaveService.ts # Auto-save triggers
│   ├── db/                   # Database layer
│   │   ├── DatabaseManager.ts # Multi-DB management
│   │   └── schemas/          # Drizzle ORM schemas
│   ├── repositories/         # Data access layer
│   ├── api/                  # API handlers
│   └── types/                # TypeScript definitions
├── scripts/
│   └── install.sh           # Installation script
├── docs/
│   └── QUICKSTART.md        # Quick start guide
└── claude_desktop_config*.json # Platform configs
```

## ⚙️ Configuration

Configuration file location: `~/.claude/mcp-memory/config.json`

```json
{
  "storage": {
    "basePath": "~/.claude/mcp-memory",
    "globalDbPath": "~/.claude/mcp-memory/global.db",
    "projectsPath": "~/.claude/mcp-memory/projects"
  },
  "performance": {
    "enableCache": true,
    "cacheSize": 100,
    "cacheTTL": 300000
  },
  "autoSave": {
    "enabled": true,
    "interval": 30,
    "triggers": ["task_complete", "test_pass"]
  }
}
```

## 🔧 Development

```bash
# Development with hot reload
npm run dev

# Run tests
npm run test
npm run test:watch
npm run test:coverage

# Lint and format
npm run lint
npm run format

# Type checking
npm run typecheck
```

## 📚 Documentation

### Available Languages
- 🇬🇧 **English**: This README and all documentation in `docs/`
- 🇯🇵 **日本語**: [README.ja.md](README.ja.md) and all documentation in `docs/*.ja.md`

### Quick Links
- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running quickly
- [Installation Guide](docs/INSTALLATION.md) - Detailed installation instructions
- [Usage Guide](docs/USAGE.md) - Learn how to use effectively
- [CLAUDE.md](CLAUDE.md) - Development guidelines for Claude Code

### Full Documentation
For comprehensive documentation, see [docs/README.md](docs/README.md) which includes:

#### Getting Started
- **[Quick Start Guide](docs/QUICKSTART.md)** ([日本語](docs/QUICKSTART.ja.md))
- **[Installation Guide](docs/INSTALLATION.md)** ([日本語](docs/INSTALLATION.ja.md))
- **[Usage Guide](docs/USAGE.md)** ([日本語](docs/USAGE.ja.md))

#### Advanced Topics (Coming Soon)
- **Configuration Guide** - Advanced configuration options
- **API Reference** - Detailed API documentation
- **Architecture Overview** - System design and architecture
- **Security Guide** - Security best practices
- **Troubleshooting** - Common issues and solutions

## 🛡️ Security

- Path validation prevents directory traversal attacks
- Project databases are isolated by hashed paths
- Sensitive data encryption support (post-MVP)
- No external network requests

## 🚀 Roadmap

### MVP (Current)
- ✅ Core memory management
- ✅ Checkpoint system
- ✅ Auto-save functionality
- ✅ Health monitoring
- ✅ Installation automation

### Post-MVP
- [ ] Data encryption
- [ ] Backup/restore functionality  
- [ ] Web UI for memory browsing
- [ ] Multi-user support
- [ ] Cloud sync capability

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT License - see LICENSE file for details