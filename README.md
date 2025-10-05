# 🎒 Tragarz

**Tragarz** (Polish for "porter/carrier") is a file synchronization system that helps you transport files between different locations with ease.

## 📦 What is Tragarz?

Tragarz consists of two main components:
- **Client**: A CLI tool for syncing files to/from a server
- **Server**: A lightweight HTTP server for managing projects and files

Perfect for developers who need to sync code between machines, teams sharing project files, or anyone who wants a simple file sync solution.

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
npm start         # Start server on port 8080
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
