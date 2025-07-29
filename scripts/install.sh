#!/bin/bash

# MCP Memory Server Installation Script
# This script sets up the MCP Memory Server for Claude Desktop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MCP_DIR="$HOME/.claude/mcp-memory"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo -e "${GREEN}MCP Memory Server Installation${NC}"
echo "================================"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}Warning: This script is designed for macOS. You may need to adjust paths for other operating systems.${NC}"
    
    # Adjust config path for other systems
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        CONFIG_FILE="$HOME/.config/Claude/claude_desktop_config.json"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        CONFIG_FILE="$APPDATA/Claude/claude_desktop_config.json"
    fi
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js version 20 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo "1. Creating directory structure..."
mkdir -p "$MCP_DIR"/{global,projects,backups,logs}

# Set appropriate permissions
chmod 700 "$MCP_DIR"
chmod 700 "$MCP_DIR"/*

echo "2. Installing dependencies..."
cd "$(dirname "$0")/.."
npm install --production

echo "3. Building the project..."
npm run build

echo "4. Copying files to MCP directory..."
cp -r dist "$MCP_DIR/"
cp package.json "$MCP_DIR/"
cp -r node_modules "$MCP_DIR/"

# Create default configuration
echo "5. Creating default configuration..."
cat > "$MCP_DIR/config.json" << EOF
{
  "storage": {
    "basePath": "$MCP_DIR",
    "globalDbPath": "$MCP_DIR/global.db",
    "projectsPath": "$MCP_DIR/projects"
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
EOF

echo "6. Initializing databases..."
cd "$MCP_DIR"
node dist/scripts/setup.js

echo "7. Configuring Claude Desktop..."
# Create config directory if it doesn't exist
CONFIG_DIR=$(dirname "$CONFIG_FILE")
mkdir -p "$CONFIG_DIR"

# Check if config file exists
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Existing Claude Desktop configuration found. Creating backup...${NC}"
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update existing config using Node.js
    node -e "
    const fs = require('fs');
    const configPath = '$CONFIG_FILE';
    let config = {};
    
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        console.log('Could not parse existing config, creating new one');
    }
    
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    config.mcpServers.memory = {
        command: 'node',
        args: ['$MCP_DIR/dist/index.js'],
        env: {
            NODE_ENV: 'production',
            MCP_MEMORY_CONFIG: '$MCP_DIR/config.json'
        }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Claude Desktop configuration updated successfully');
    "
else
    # Create new config
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["$MCP_DIR/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_MEMORY_CONFIG": "$MCP_DIR/config.json"
      }
    }
  }
}
EOF
fi

# Create uninstall script
echo "8. Creating uninstall script..."
cat > "$MCP_DIR/uninstall.sh" << 'EOF'
#!/bin/bash

echo "Uninstalling MCP Memory Server..."

# Remove from Claude Desktop config
if [ -f "$CONFIG_FILE" ]; then
    node -e "
    const fs = require('fs');
    const configPath = '$CONFIG_FILE';
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.mcpServers && config.mcpServers.memory) {
            delete config.mcpServers.memory;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('Removed from Claude Desktop configuration');
        }
    } catch (e) {
        console.error('Error updating config:', e);
    }
    "
fi

# Remove directory
rm -rf "$MCP_DIR"

echo "MCP Memory Server has been uninstalled."
EOF

chmod +x "$MCP_DIR/uninstall.sh"

echo
echo -e "${GREEN}Installation completed successfully!${NC}"
echo
echo "MCP Memory Server has been installed at: $MCP_DIR"
echo
echo "Next steps:"
echo "1. Restart Claude Desktop to load the MCP Memory Server"
echo "2. The server will start automatically when Claude Desktop launches"
echo
echo "To uninstall, run: $MCP_DIR/uninstall.sh"
echo
echo "For more information, see the documentation at:"
echo "https://github.com/your-username/mcp-memory-server"