# Installation Guide

This guide provides detailed installation instructions for the MCP Memory Server across different platforms.

## Prerequisites

Before installing, ensure you have:

- Node.js 20 or higher
- npm or pnpm package manager  
- Claude Desktop or Claude Code CLI
- Git (for cloning the repository)

### Checking Prerequisites

```bash
# Check Node.js version
node --version  # Should show v20.x.x or higher

# Check npm version
npm --version

# Check if Claude Desktop is installed
# macOS
ls "/Applications/Claude.app" 2>/dev/null && echo "Claude Desktop found" || echo "Claude Desktop not found"

# Windows
if exist "%LOCALAPPDATA%\Programs\Claude\Claude.exe" (echo Claude Desktop found) else (echo Claude Desktop not found)

# Check if Claude Code CLI is installed
claude --version
```

## Automated Installation

### macOS/Linux

We provide an installation script that handles the entire setup process:

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# Make the script executable
chmod +x scripts/install.sh

# Run the installation
./scripts/install.sh
```

The script will:
1. Check for prerequisites
2. Install dependencies
3. Build the project
4. Create the directory structure
5. Copy files to the installation directory
6. Configure Claude Desktop automatically (if installed)
7. Create default configuration files
8. Provide instructions for Claude Code CLI setup

### What the Script Does

```bash
# Creates directory structure
~/.claude/mcp-memory/
├── dist/           # Compiled JavaScript files
├── global/         # Global preferences database
├── projects/       # Project-specific databases
├── backups/        # Backup storage
├── logs/           # Server logs
├── config.json     # Server configuration
└── uninstall.sh    # Uninstallation script
```

## Manual Installation

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-memory-server.git
cd mcp-memory-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 2: Create Directory Structure

#### macOS/Linux
```bash
# Create the MCP directory
mkdir -p ~/.claude/mcp-memory/{global,projects,backups,logs}

# Copy built files
cp -r dist ~/.claude/mcp-memory/
cp package.json ~/.claude/mcp-memory/
cp -r node_modules ~/.claude/mcp-memory/
```

#### Windows (PowerShell)
```powershell
# Create the MCP directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\global"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\projects"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\backups"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\mcp-memory\logs"

# Copy built files
Copy-Item -Recurse dist "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item package.json "$env:USERPROFILE\.claude\mcp-memory\"
Copy-Item -Recurse node_modules "$env:USERPROFILE\.claude\mcp-memory\"
```

### Step 3: Configure Your Claude Environment

#### Option A: Using Claude Code CLI (Recommended)

```bash
# Add the MCP server to Claude Code
claude mcp add memory node ~/.claude/mcp-memory/dist/index.js

# For Windows, use:
claude mcp add memory node %USERPROFILE%\.claude\mcp-memory\dist\index.js

# Verify installation
claude mcp list

# Check server details
claude mcp get memory
```

After adding, you can use memory tools in Claude Code:
- Type `/mcp` to see available servers and tools
- Use memory commands naturally in conversation

#### Option B: Configure Claude Desktop

Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the MCP Memory Server configuration:

#### macOS/Linux Configuration
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

#### Windows Configuration
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

### Step 4: Create Configuration File

Create `~/.claude/mcp-memory/config.json`:

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
    "cacheTTL": 300000,
    "connectionPoolSize": 5,
    "enableWAL": true,
    "busyTimeout": 5000
  },
  "autoSave": {
    "enabled": true,
    "interval": 30,
    "triggers": ["task_complete", "test_pass", "checkpoint_created"],
    "maxRetries": 3,
    "retryDelay": 1000
  },
  "logging": {
    "level": "info",
    "file": "~/.claude/mcp-memory/logs/mcp-memory.log",
    "maxFiles": 5,
    "maxSize": "10m"
  }
}
```

### Step 5: Restart Your Claude Application

- **Claude Desktop**: Restart Claude Desktop for the changes to take effect
- **Claude Code CLI**: The changes take effect immediately

## Verification

### Check Installation

#### For Claude Code CLI
1. Open Claude Code
2. Type `/mcp` to see if the memory server is listed
3. Ask Claude: "Can you check the memory server health?"

#### For Claude Desktop
1. Open Claude Desktop
2. In a conversation, ask Claude: "Can you check the memory server health?"
3. Claude should be able to use the `health` tool and report the server status

### Test Basic Functionality

```
You: "Remember that I prefer to use pnpm instead of npm"
Claude: [Uses save_global_preference tool]

You: "What are my development preferences?"
Claude: [Uses get_global_preference tool and shows your saved preferences]
```

### Check Logs

```bash
# View server logs
tail -f ~/.claude/mcp-memory/logs/mcp-memory.log
```

## Troubleshooting Installation

### Common Issues

#### 1. Server Not Starting

**Symptoms**: Claude can't access memory tools

**Solutions**:
- Check Node.js version: `node --version` (must be 20+)
- Verify file permissions: `ls -la ~/.claude/mcp-memory/`
- Check Claude Desktop logs for errors
- Try running manually: `node ~/.claude/mcp-memory/dist/index.js`

#### 2. Permission Denied Errors

**macOS/Linux**:
```bash
# Fix permissions
chmod -R 755 ~/.claude/mcp-memory
chmod +x ~/.claude/mcp-memory/dist/index.js
```

#### 3. Module Not Found Errors

```bash
# Reinstall dependencies
cd ~/.claude/mcp-memory
npm install --production
```

#### 4. Configuration Not Loading

- Ensure config file exists: `~/.claude/mcp-memory/config.json`
- Validate JSON syntax
- Check file permissions

### Platform-Specific Issues

#### macOS

If you get "Operation not permitted" errors:
1. Go to System Preferences → Security & Privacy
2. Give Terminal/iTerm full disk access

#### Windows

If paths aren't resolving correctly:
1. Use full paths instead of `~` or `%USERPROFILE%`
2. Use forward slashes or escaped backslashes in JSON

#### Linux

If you're using a non-standard shell:
1. Ensure `~` expands correctly
2. Use absolute paths if needed

## Updating the Server

To update to a newer version:

```bash
# Navigate to the source directory
cd /path/to/mcp-memory-server

# Pull latest changes
git pull

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Copy updated files
cp -r dist ~/.claude/mcp-memory/
cp package.json ~/.claude/mcp-memory/
```

## Uninstalling

### Automated Uninstall (macOS/Linux)

```bash
~/.claude/mcp-memory/uninstall.sh
```

### Manual Uninstall

1. Remove the server configuration from Claude Desktop config
2. Delete the installation directory:
   - macOS/Linux: `rm -rf ~/.claude/mcp-memory`
   - Windows: `rmdir /s "%USERPROFILE%\.claude\mcp-memory"`

## Next Steps

- Read the [Quick Start Guide](QUICKSTART.md) for usage instructions
- Check the [Configuration Guide](CONFIG.md) for advanced settings
- Review [Security Best Practices](SECURITY.md)
- Report issues on [GitHub](https://github.com/your-username/mcp-memory-server/issues)