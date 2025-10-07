# 🎒 Tragarz

**Tragarz** (Polish for "porter/carrier") is a super lightweight alternative to Git for solo developers and simple file synchronization.

## 💡 Why Tragarz?

**Git is overkill for simple file sync.** If you're working alone and just need to:
- ✅ Sync files between your laptop and desktop
- ✅ Keep backups of your projects
- ✅ Share files with clients without Git complexity
- ✅ Have simple "save points" (snapshots) without Git branches/commits

**Tragarz is your answer!** No staging area, no merge conflicts, no Git learning curve.

## 📦 What is Tragarz?

Tragarz consists of two main components:
- **Client**: Simple CLI tool - just `push`, `pull`, and `memory` (snapshots)
- **Server**: Lightweight HTTP server (way simpler than Git server setup)

**Perfect for:**
- 👨‍💻 Solo developers who find Git too complex for simple sync
- 🎨 Designers sharing files with clients
- 📱 Anyone syncing projects between devices
- 🚀 Quick prototyping without Git overhead

## 🆚 Tragarz vs Git

| Feature | Git | Tragarz |
|---------|-----|---------|
| **Learning curve** | Steep (branches, staging, merging) | Simple (3 commands) |
| **Solo dev workflow** | `git add`, `git commit`, `git push` | `tragarz push` |
| **Conflicts** | Manual merge conflicts | Auto-overwrite or backup |
| **Server setup** | Complex (bare repos, hooks) | `npm start` |
| **File sync** | Designed for teams/versions | Designed for file transport |
| **Snapshots** | Complex commits/tags | `tragarz memory "description"` |

**Use Tragarz when:** You need simple file sync, not version control.
**Use Git when:** You need professional version control for teams.

## 🚀 Quick Start

### Install Client
```bash
npm install -g tragarz
```

### Basic Usage
```bash
# Connect to a project
tragarz connect MyProject https://your-server.com password123

# Upload your files
tragarz push

# Download changes
tragarz pull

# Create snapshots
tragarz memory "Before big refactor"
```

## 📁 Repository Structure

```
tragarz/
├── client/          # CLI client (published as 'tragarz')
├── server/          # Server component (published as 'tragarz-server')
├── README.md        # This file
└── CLAUDE.md        # Development guide for AI assistants
```

## 🛠️ Development

### Client Development
```bash
cd client
npm install
npm link          # Install globally as 'tragarz'
```

### Server Development
```bash
cd server
npm install
npm link          # Install globally as 'tragarz-server'
```

### Server Installation & Usage
```bash
# Install globally
npm install -g tragarz-server

# Initialize server in your directory
cd ~/my-tragarz-server
tragarz-server init

# (Optional) Edit configuration
nano tragarzserver.json

# Start the server
tragarz-server start
```

## 📚 Documentation

- **[Client Documentation](client/README.md)** - CLI usage, commands, examples
- **[Server Documentation](server/README.md)** - Server setup, API endpoints
- **[Development Guide](CLAUDE.md)** - Architecture and development notes

## ✨ Features

### Client Features
- 🔄 **Smart Sync** - Only uploads/downloads changed files
- 📸 **Snapshots** - Create project backups with one command
- 🚫 **Ignore Files** - Support for `.tragarzignore` (like `.gitignore`)
- 🔐 **Secure** - Token-based authentication
- 🎨 **Beautiful CLI** - Colorful output with progress indicators

### Server Features
- 🌐 **HTTP API** - RESTful endpoints for all operations
- 📁 **Project Management** - Multiple projects per server
- 📦 **ZIP Snapshots** - Compressed project backups
- 🛡️ **Security** - Password protection, rate limiting, path validation
- 🔧 **Configurable** - JSON configuration file

## 🌍 Language

Tragarz uses Polish naming to stand out:
- **Tragarz** = Porter/Carrier (the one who carries things)
- **Perfect for international developers** who want something unique

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Issues

Found a bug? Have a feature request? Please open an issue on GitHub.

## ⭐ Show your support

Give a ⭐️ if this project helped you!
