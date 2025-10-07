# Tragarz Server

HTTP server component for Tragarz file synchronization system.

## Installation

```bash
npm install -g tragarz-server
```

## Quick Start

### 1. Initialize Server

```bash
# Create a directory for your server
mkdir ~/my-tragarz-server
cd ~/my-tragarz-server

# Initialize server (creates config and projects directory)
tragarz-server init
```

This creates:
- `tragarzserver.json` - Server configuration
- `projects/` - Directory for project files

### 2. Configure (Optional)

Edit `tragarzserver.json`:

```json
{
  "port": 8080,
  "password": "admin123",
  "dataDir": "./projects",
  "maxProjectSize": "1GB",
  "allowedHosts": ["*"]
}
```

### 3. Start Server

```bash
tragarz-server start
```

The server will:
- Load configuration from current directory
- Create projects directory if needed
- Start listening on configured port

## Commands

### `tragarz-server init`
Initialize server in current directory. Creates:
- Configuration file (`tragarzserver.json`)
- Projects directory

### `tragarz-server start`
Start the server using configuration from current directory.

### `tragarz-server help`
Show help message with all available commands.

## Configuration

### tragarzserver.json

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 8080 | Server port |
| `password` | string | "admin123" | Authentication password |
| `dataDir` | string | "./projects" | Projects storage directory |
| `maxProjectSize` | string | "1GB" | Maximum project size |
| `allowedHosts` | array | ["*"] | CORS allowed hosts |

### Security

- Change the default password immediately
- Use HTTPS in production (reverse proxy recommended)
- Limit `allowedHosts` to specific domains if needed
- Keep `maxProjectSize` reasonable to prevent abuse

## API Endpoints

### Authentication
- `POST /auth` - Authenticate and get token

### Projects
- `GET /projects` - List all projects
- `POST /projects/:name` - Create new project
- `GET /projects/:name/info` - Get project info

### Files
- `GET /projects/:name/files` - List project files
- `POST /projects/:name/files` - Upload files
- `GET /projects/:name/files/*` - Download file
- `DELETE /projects/:name/files/*` - Delete file

### Snapshots
- `POST /projects/:name/snapshot` - Create snapshot
- `GET /projects/:name/snapshots` - List snapshots
- `POST /projects/:name/restore/:snapshotId` - Restore snapshot

## Development

### Local Development

```bash
cd server
npm install
npm link

# In your test directory
mkdir ~/test-tragarz
cd ~/test-tragarz
tragarz-server init
tragarz-server start
```

### Project Structure

```
server/
├── src/
│   ├── server.js           # Main server class
│   ├── auth.js            # Authentication manager
│   ├── projectManager.js  # Project operations
│   ├── fileManager.js     # File operations
│   └── snapshotManager.js # Snapshot operations
├── bin/
│   └── tragarz-server.js  # CLI wrapper
└── package.json
```

## Security Features

- Password-based authentication
- Token-based session management (JWT)
- Rate limiting (100 requests per 15 minutes)
- Path traversal protection
- File size limits
- Input validation
- CORS configuration
- Helmet security headers

## Deployment

### Simple Deployment

```bash
# On your server
npm install -g tragarz-server
cd /var/tragarz
tragarz-server init

# Edit config
nano tragarzserver.json

# Start (consider using pm2 or systemd)
tragarz-server start
```

### With PM2

```bash
npm install -g pm2
cd /var/tragarz
tragarz-server init

# Create ecosystem file
pm2 start "tragarz-server start" --name tragarz
pm2 save
pm2 startup
```

### With systemd

Create `/etc/systemd/system/tragarz.service`:

```ini
[Unit]
Description=Tragarz Server
After=network.target

[Service]
Type=simple
User=tragarz
WorkingDirectory=/var/tragarz
ExecStart=/usr/bin/tragarz-server start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable tragarz
sudo systemctl start tragarz
```

### Behind Nginx

```nginx
server {
    listen 80;
    server_name tragarz.example.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Port Already in Use

```bash
# Change port in config
nano tragarzserver.json
# Set "port": 8081
```

### Permission Issues

```bash
# Make sure projects directory is writable
chmod 755 projects/
```

### Can't Find Configuration

Server looks for `tragarzserver.json` in the **current working directory**.

Make sure you:
1. Run `tragarz-server init` in your desired directory
2. Run `tragarz-server start` from the **same directory**

```bash
# Wrong
cd ~
tragarz-server init
cd /tmp
tragarz-server start  # Will fail - no config here!

# Correct
cd ~/my-tragarz
tragarz-server init
tragarz-server start  # Works - config is here
```

## License

MIT
