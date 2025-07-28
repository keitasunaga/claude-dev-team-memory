# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) Memory Server that provides persistent context and memory management for Claude Code development sessions. It solves the problem of context loss during long development sessions by maintaining both global user preferences and project-specific memory across sessions.

## Core Architecture

The system uses a **dual-database architecture**:
- **Global Database**: Stores user preferences and development styles that persist across all projects
- **Project Databases**: Individual SQLite databases per project (hashed by project path) containing issue context, tasks, checkpoints, and session state

### Key Components

**MCPMemoryServer** (`src/server/MCPMemoryServer.ts`): Main MCP server that exposes tools for memory management
**DatabaseManager** (`src/db/DatabaseManager.ts`): Manages multiple SQLite databases with Drizzle ORM
**Schemas**: Separate schemas for global (`src/db/schemas/global.ts`) and project (`src/db/schemas/project.ts`) databases

### Data Flow

1. MCP tools receive memory operations (save/get preferences, context, checkpoints)
2. DatabaseManager routes operations to appropriate database (global vs project-specific)
3. Drizzle ORM handles SQL operations with type safety
4. Results returned through MCP protocol to Claude Code

## Development Commands

### Build and Development
```bash
npm run build         # Build with tsup (outputs to dist/)
npm run dev          # Development with hot reload using tsx
npm run start        # Start production server from dist/
```

### Testing
```bash
npm run test         # Run all tests with Vitest
npm run test:watch   # Watch mode for development
npm run test:coverage # Generate coverage report (requires 80%+ coverage)
npm run test:ui      # Interactive test UI
```

### Code Quality
```bash
npm run lint         # ESLint with TypeScript rules
npm run format       # Prettier formatting
npm run typecheck    # TypeScript type checking without emit
```

### Database Operations
```bash
npm run migrate      # Run database migrations
npm run setup        # Initial setup script
```

## Database Schema Architecture

### Global Schema
- **global_preferences**: User development preferences (category/key/value structure)
- **global_metadata**: Schema versioning and migration tracking

### Project Schema (per project)
- **project_info**: Basic project metadata and access tracking
- **current_issue**: Active issue context with requirements and design decisions
- **tasks**: Task management with status tracking (pending/in_progress/completed)
- **checkpoints**: Development state snapshots for session restoration
- **session_state**: Current session information (branch, modified files, etc.)

## MCP Tools Available

The server exposes these tools to Claude Code:

- `save_global_preference` / `get_global_preference`: Persistent user settings
- `save_project_context` / `get_project_context`: Project-specific memory
- `create_checkpoint` / `list_checkpoints`: Development state snapshots

## Testing Architecture

**Test Setup** (`src/__tests__/setup.ts`): Comprehensive test configuration with:
- Temporary database isolation per test
- Mock data generators for all entity types  
- Test utilities for common operations
- 80%+ coverage requirements enforced

**Test Structure**:
- Unit tests for individual components
- Integration tests for MCP server functionality
- Fixtures and mock data in `src/__tests__/fixtures/`

## Configuration Management

Server configuration is type-safe via `ServerConfig` interface covering:
- Storage paths and database locations
- Performance tuning (cache, connection pooling, SQLite optimization)
- Security settings (encryption, access control)
- Auto-save triggers and intervals
- Logging configuration

## Development Patterns

### Database Management
- Each project gets isolated SQLite database (hashed path prevents conflicts)
- WAL mode enabled for better concurrency
- Drizzle ORM provides type-safe SQL operations
- Migration system handles schema evolution

### Error Handling
- Structured logging with Pino logger
- MCP-compliant error responses
- Graceful shutdown handling for SIGINT/SIGTERM

### Type Safety
- Comprehensive TypeScript types in `src/types/index.d.ts`
- Drizzle schema inference for database types
- Strict TypeScript configuration with comprehensive checks

### Memory Management Philosophy
The system implements **persistent development context** where:
- Global preferences persist across all projects (user development style)
- Project memory maintains issue context, task lists, and checkpoints
- Checkpoints capture complete development state for session restoration
- Auto-save triggers ensure minimal context loss

## Testing a Single File

```bash
# Test specific file
npm run test src/path/to/file.test.ts

# Test with watch mode
npm run test:watch src/path/to/file.test.ts
```

## Important Implementation Notes

- All MCP tool handlers currently contain TODO placeholders for Drizzle ORM implementation
- Database optimization settings are configurable and disabled in test environment
- Project databases are created on-demand when first accessed
- The system supports both backup/restore and data export functionality (types defined)