# MCP Memory Server Documentation

Welcome to the comprehensive documentation for the MCP Memory Server. This documentation covers installation, usage, configuration, and development of the memory server for Claude Code.

## Documentation Structure

### Getting Started
- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions for all platforms
- **[Usage Guide](USAGE.md)** - Learn how to use the memory server effectively

### Configuration & Customization
- **[Configuration Guide](CONFIG.md)** - Advanced configuration options
- **[API Reference](API.md)** - Detailed API documentation for developers
- **[MCP Tools Reference](TOOLS.md)** - Complete list of available MCP tools

### Development
- **[Architecture Overview](ARCHITECTURE.md)** - System design and architecture
- **[Development Guide](DEVELOPMENT.md)** - Contributing and development setup
- **[Testing Guide](TESTING.md)** - Writing and running tests

### Operations
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security Guide](SECURITY.md)** - Security best practices and considerations
- **[Monitoring Guide](MONITORING.md)** - Health checks and monitoring

### References
- **[FAQ](FAQ.md)** - Frequently asked questions
- **[Changelog](CHANGELOG.md)** - Version history and updates
- **[Glossary](GLOSSARY.md)** - Technical terms and concepts

## Quick Links

### For Users
1. Start with the [Quick Start Guide](QUICKSTART.md)
2. Read the [Usage Guide](USAGE.md) for daily workflows
3. Check [FAQ](FAQ.md) for common questions

### For Administrators
1. Follow the [Installation Guide](INSTALLATION.md)
2. Configure using the [Configuration Guide](CONFIG.md)
3. Monitor with the [Monitoring Guide](MONITORING.md)

### For Developers
1. Understand the [Architecture](ARCHITECTURE.md)
2. Set up development with the [Development Guide](DEVELOPMENT.md)
3. Reference the [API Documentation](API.md)

## Overview

The MCP Memory Server is a Model Context Protocol server that provides persistent memory management for Claude Code. It solves the critical problem of context loss during long development sessions by maintaining both global user preferences and project-specific memory.

### Key Features

- **Dual Memory Architecture**: Separate global and project-specific memory stores
- **Automatic Persistence**: Never lose context between sessions
- **Checkpoint System**: Save and restore development states
- **Auto-Save**: Triggered by development events
- **Type-Safe**: Full TypeScript implementation
- **Secure**: Path validation and data isolation

### Use Cases

1. **Long Development Sessions**: Maintain context across hours or days of work
2. **Project Switching**: Seamlessly switch between multiple projects
3. **Team Collaboration**: Share project context and checkpoints
4. **Issue Tracking**: Keep issue requirements and progress in sync
5. **Development Preferences**: Consistent coding standards across projects

## Getting Help

- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-username/mcp-memory-server/issues)
- **Discussions**: Join the community on [GitHub Discussions](https://github.com/your-username/mcp-memory-server/discussions)
- **Updates**: Follow the [Changelog](CHANGELOG.md) for new features

## Contributing

We welcome contributions! Please see our [Development Guide](DEVELOPMENT.md) for details on:
- Setting up your development environment
- Code style and standards
- Testing requirements
- Pull request process

## License

This project is licensed under the MIT License. See the LICENSE file in the repository root for details.