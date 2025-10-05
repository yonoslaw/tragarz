# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tragarz is a file synchronization system consisting of two main components:
- **tragarz-client**: CLI tool for project synchronization
- **tragarz-server**: HTTP server for managing projects and files

This is a monorepo structure where each component is in its own directory with separate PLAN.md files documenting the architecture.

## Architecture

### Client (tragarz-client/)
CLI tool with the following commands:
- `tragarz connect PROJECT_NAME SERVER_URL PASSWORD` - Connect to a project or create new one
- `tragarz push` - Upload local changes to server
- `tragarz pull` - Download changes from server
- `tragarz memory [DESCRIPTION]` - Create project snapshot

Key components planned:
- CLI interface using commander.js
- File synchronization with hash-based change detection
- Configuration management via .tragarz.json
- Support for .tragarzignore files

### Server (tragarz-server/)
Express.js HTTP server providing:
- Project management API
- File upload/download endpoints
- Snapshot creation and restoration
- Authentication via password

Key endpoints planned:
- `POST /auth` - Authentication
- `/projects/:name/*` - Project operations
- File management with multer for uploads
- ZIP-based snapshots using archiver

## Development Status

**Important**: This appears to be a planning-stage project. The repository currently contains only:
- Architecture documentation in PLAN.md files
- No actual implementation code
- No package.json files or dependencies
- No build/test/run scripts

When implementing:
1. Each component (client/server) should have its own package.json
2. Follow the architecture outlined in the respective PLAN.md files
3. Client should be installable as a global CLI tool
4. Server should be runnable as a standalone service

## Configuration

The project uses a custom configuration file structure:
- Client: `.tragarz.json` for project configuration
- Server: `tragarzserver.json` for server settings
- Ignore patterns: `.tragarzignore` (similar to .gitignore)

## Security Considerations

Both PLAN.md files emphasize security features:
- Token-based authentication
- File integrity checking via hashes
- Path traversal protection
- File size limits
- Input validation for project/file names