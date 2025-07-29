# Usage Guide

This guide explains how to use the MCP Memory Server effectively in your Claude Code development sessions.

## Overview

The MCP Memory Server provides two types of memory:

1. **Global Memory**: Your personal preferences that persist across all projects
2. **Project Memory**: Context specific to each project you work on

## Basic Concepts

### Global Preferences

These are your personal development preferences that Claude remembers across all projects:

- Language preferences (e.g., "respond in Japanese")
- Package manager choices (e.g., "use pnpm")
- Code style preferences (e.g., "use 2 spaces for indentation")
- Testing requirements (e.g., "ensure 80% coverage")
- Commit message formats (e.g., "use conventional commits")

### Project Context

Each project maintains its own memory including:

- Current issue details and requirements
- Task lists with completion status
- Development checkpoints
- Session state (current branch, modified files)
- Design decisions and technical notes

## Using Memory Features

### Saving Global Preferences

Simply tell Claude about your preferences in natural language:

```
"Remember that I prefer to use pnpm instead of npm"
"I always want TypeScript with strict mode enabled"
"Please respond to me in Japanese"
"I follow the conventional commits specification"
```

Claude will automatically save these preferences using the `save_global_preference` tool.

### Retrieving Preferences

Ask Claude about your preferences:

```
"What are my development preferences?"
"Do you remember my package manager preference?"
"What coding style do I use?"
```

### Working with Project Context

#### Starting a New Issue

When you begin working on a new issue:

```
"I'm starting work on issue #42: Add user authentication"
"The requirements are: JWT-based auth, refresh tokens, and role-based access"
"Design decisions: Use Passport.js, PostgreSQL for user storage"
```

Claude saves this context and will remember it across sessions.

#### Managing Tasks

Create and track tasks:

```
"Add these tasks:
1. Set up Passport.js
2. Create user model
3. Implement JWT strategy
4. Add authentication middleware
5. Create login/logout endpoints"

"Mark task 1 as completed"
"What tasks are remaining?"
```

#### Creating Checkpoints

Save your progress at important moments:

```
"Create a checkpoint before I start the refactoring"
"Save checkpoint: Authentication implementation complete"
"Create a checkpoint named 'pre-deploy-v1.0'"
```

#### Restoring from Checkpoints

Return to a previous state:

```
"List available checkpoints"
"Restore from the checkpoint named 'pre-refactoring'"
"Go back to yesterday's checkpoint"
```

## Practical Workflows

### Daily Development Flow

1. **Morning Start**
   ```
   You: "What was I working on in this project?"
   Claude: [Retrieves project context and shows current issue, tasks, and progress]
   ```

2. **During Development**
   ```
   You: "I've completed the user model implementation"
   Claude: [Updates task status and triggers auto-save]
   ```

3. **Before Major Changes**
   ```
   You: "Create a checkpoint before refactoring the auth system"
   Claude: [Creates checkpoint with current state]
   ```

4. **End of Day**
   ```
   You: "Save the current session state"
   Claude: [Saves all context including modified files and current branch]
   ```

### Handling Context Loss

If Claude loses context (e.g., after timeout):

```
You: "Restore my previous session"
Claude: [Automatically retrieves last session state and continues where you left off]
```

### Multi-Project Development

When switching between projects:

```
You: "I'm switching to the frontend project"
Claude: [Loads the frontend project's specific context]

You: "What's the status of the API project?"
Claude: [Retrieves and shows the API project's context without switching]
```

## Advanced Features

### Auto-Save Triggers

The server automatically creates checkpoints when:
- A task is marked as complete
- Tests pass successfully  
- You explicitly request a checkpoint
- At regular intervals (configurable)

### Session State Tracking

The server tracks:
- Current Git branch
- Modified files list
- Active task
- Last checkpoint timestamp

### Checkpoint Management

```
"Compare the current state with the last checkpoint"
"Delete old checkpoints keeping only the last 5"
"Show me what changed since checkpoint 'pre-refactoring'"
```

## Best Practices

### 1. Be Descriptive with Checkpoints

Instead of:
```
"Create checkpoint"
```

Use:
```
"Create checkpoint: OAuth implementation complete with Google provider"
```

### 2. Regular Context Updates

Keep Claude informed about progress:
```
"I've finished the database migrations"
"Found a bug in the auth middleware, working on a fix"
"Switching approach to use Redis for session storage"
```

### 3. Use Clear Task Descriptions

Instead of:
```
"Add task: fix bug"
```

Use:
```
"Add task: Fix authentication timeout bug in JWT refresh logic"
```

### 4. Leverage Global Preferences

Set preferences once and Claude remembers:
```
"I always want you to:
- Use async/await instead of promises
- Add JSDoc comments to all functions
- Follow RESTful naming conventions"
```

## Tips and Tricks

### Quick Status Check
```
"What's my current status?" - Shows active issue, current task, and session info
```

### Bulk Task Management
```
"Mark tasks 2, 3, and 5 as completed"
"Move all pending tasks to in-progress"
```

### Context Search
```
"What were the design decisions for the auth system?"
"Show me all tasks related to testing"
```

### Time-based Queries
```
"What was I working on yesterday?"
"Show checkpoints from this week"
```

## Memory Organization

The server organizes memory as follows:

```
Global Memory:
├── language: "Japanese"
├── package_manager: "pnpm"
├── testing: "vitest with 80% coverage"
└── code_style: "prettier with 2 spaces"

Project Memory (per project):
├── Issue Context:
│   ├── number: "#42"
│   ├── title: "Add authentication"
│   ├── requirements: [...]
│   └── design_decisions: [...]
├── Tasks:
│   ├── completed: []
│   ├── in_progress: {}
│   └── pending: []
└── Session:
    ├── branch: "feature/auth"
    ├── modified_files: []
    └── last_checkpoint: "2024-01-20T10:30:00Z"
```

## Troubleshooting Usage

### Memory Not Persisting

1. Check server health: "Check memory server status"
2. Verify saves: "Did you save my last preference?"
3. Look for errors in logs

### Wrong Context Loaded

1. Verify project: "What project am I in?"
2. Check path: "What's the project path?"
3. Manually specify: "Load context for /path/to/project"

### Checkpoint Issues

1. List checkpoints: "Show all checkpoints"
2. Validate specific checkpoint: "Check if checkpoint 'X' is valid"
3. Use fallback: "Restore from the second-to-last checkpoint"

## Integration with Development Tools

### Git Integration
```
"Save the current branch in session state"
"What branch was I on in the last session?"
```

### Issue Tracker Integration
```
"Update issue context from GitHub issue #42"
"Save these requirements from Jira ticket ABC-123"
```

### IDE State
```
"Remember that I had these files open: [file list]"
"What files was I working on?"
```

## Next Steps

- Explore [Configuration Options](CONFIG.md) for customization
- Read about [Security Best Practices](SECURITY.md)
- Learn about [API Integration](API.md) for custom tools
- Check [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues