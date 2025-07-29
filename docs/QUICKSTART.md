# MCP Memory Server Quick Start Guide

Welcome to MCP Memory Server! This guide will help you get started with persistent memory management for Claude Code and Claude Desktop.

## Prerequisites

- Node.js 20 or higher
- npm or pnpm
- Claude Desktop or Claude Code CLI

## Installation

### macOS/Linux

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# Run the installation script
chmod +x scripts/install.sh
./scripts/install.sh
```

### Windows

```powershell
# Clone the repository
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# Install dependencies
npm install --production

# Build the project
npm run build

# Create directory structure
mkdir "$env:USERPROFILE\.claude\mcp-memory"
mkdir "$env:USERPROFILE\.claude\mcp-memory\global"
mkdir "$env:USERPROFILE\.claude\mcp-memory\projects"
mkdir "$env:USERPROFILE\.claude\mcp-memory\backups"
mkdir "$env:USERPROFILE\.claude\mcp-memory\logs"

# Copy files
Copy-Item -Recurse dist "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item package.json "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item -Recurse node_modules "$env:USERPROFILE\.claude\mcp-memory\"
```

## Configuration

### Option 1: Claude Code CLI (Recommended)

The easiest way to use the MCP Memory Server is through Claude Code CLI:

```bash
# Add the MCP server
claude mcp add memory node ~/.claude/mcp-memory/dist/index.js

# For Windows, use full path:
claude mcp add memory node %USERPROFILE%\.claude\mcp-memory\dist\index.js

# Verify it's added
claude mcp list

# Check server details
claude mcp get memory
```

Once added, you can use the memory tools in Claude Code by:
1. Typing `/mcp` to see available servers and tools
2. Using the memory commands naturally in your conversation

### Option 2: Claude Desktop Configuration

If you prefer using Claude Desktop, manually configure it:

1. Find your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the MCP Memory Server configuration:

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

For Windows, use:
```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["%USERPROFILE%\\.claude\\mcp-memory\\dist\\index.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_MEMORY_CONFIG": "%USERPROFILE%\\.claude\\mcp-memory\\config.json"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Using MCP Memory Server

Once installed, the MCP Memory Server provides the following capabilities:

### Global Preferences

Save your development preferences that persist across all projects:

```
- Language preference (e.g., "Respond in Japanese")
- Commit message style (e.g., "Use conventional commits")
- Package manager preference (e.g., "Use pnpm")
- Testing requirements (e.g., "80% coverage minimum")
```

### Project Memory

The server automatically tracks:

- Current issue context
- Task lists and progress
- Session state
- Development checkpoints

### Available Commands

The server exposes these tools to Claude:

- `save_global_preference` - Save a global preference
- `get_global_preference` - Retrieve global preferences
- `save_project_context` - Save project-specific context
- `get_project_context` - Retrieve project context
- `create_checkpoint` - Create a development checkpoint
- `list_checkpoints` - List available checkpoints
- `restore_checkpoint` - Restore from a checkpoint
- `health` - Check server health status

## Example Usage

When working with Claude, you can say things like:

- "Remember that I prefer pnpm over npm"
- "Save the current issue context"
- "Create a checkpoint before refactoring"
- "What was I working on in this project?"
- "Restore from the last checkpoint"

## Configuration

The server configuration is stored at `~/.claude/mcp-memory/config.json`:

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

## Troubleshooting

### Server not starting

1. Check Claude Desktop logs for errors
2. Verify Node.js version: `node --version` (should be 20+)
3. Check file permissions on the installation directory
4. Try running the server manually: `node ~/.claude/mcp-memory/dist/index.js`

### Memory not persisting

1. Check if the database files exist in `~/.claude/mcp-memory/`
2. Verify write permissions on the directory
3. Check server health: Ask Claude to check the memory server health

### Installation issues

1. Ensure all prerequisites are installed
2. Check that the paths in the config file are correct
3. Try manual installation if the script fails

## Uninstalling

To uninstall the MCP Memory Server:

### macOS/Linux
```bash
~/.claude/mcp-memory/uninstall.sh
```

### Windows
1. Remove the server configuration from Claude Desktop config
2. Delete the directory: `rmdir /s "%USERPROFILE%\.claude\mcp-memory"`

## Support

For issues or questions:
- Check the [full documentation](../README.md)
- Report issues on [GitHub](https://github.com/your-username/mcp-memory-server/issues)

## Next Steps

- Explore the [API documentation](API.md) for advanced usage
- Learn about [custom configurations](CONFIG.md)
- Read about [security best practices](SECURITY.md)