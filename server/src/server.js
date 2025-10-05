const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');

const AuthManager = require('./auth');
const ProjectManager = require('./projectManager');
const FileManager = require('./fileManager');
const SnapshotManager = require('./snapshotManager');

class TragarzServer {
    constructor() {
        this.app = express();
        this.config = null;
        this.authManager = null;
        this.projectManager = null;
        this.fileManager = null;
        this.snapshotManager = null;
    }

    async loadConfig() {
        const configPath = path.join(__dirname, '..', 'tragarzserver.json');

        if (await fs.pathExists(configPath)) {
            this.config = await fs.readJson(configPath);
        } else {
            this.config = {
                port: 8080,
                password: 'admin123',
                dataDir: './projects',
                maxProjectSize: '1GB',
                allowedHosts: ['*']
            };
            await fs.writeJson(configPath, this.config, { spaces: 2 });
            console.log('Created default configuration file:', configPath);
        }

        await fs.ensureDir(path.resolve(this.config.dataDir));
        console.log('Configuration loaded:', this.config);
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors({
            origin: this.config.allowedHosts.includes('*') ? true : this.config.allowedHosts
        }));

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Too many requests from this IP'
        });
        this.app.use(limiter);

        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    initializeManagers() {
        this.authManager = new AuthManager(this.config.password);
        this.projectManager = new ProjectManager(this.config.dataDir);
        this.fileManager = new FileManager(this.config.dataDir);
        this.snapshotManager = new SnapshotManager(this.config.dataDir);
    }

    setupRoutes() {
        this.app.post('/auth', this.authManager.authenticate.bind(this.authManager));

        this.app.use('/projects', this.authManager.requireAuth.bind(this.authManager));

        this.app.get('/projects', this.projectManager.listProjects.bind(this.projectManager));
        this.app.post('/projects/:name', this.projectManager.createProject.bind(this.projectManager));
        this.app.get('/projects/:name/info', this.projectManager.getProjectInfo.bind(this.projectManager));

        this.app.get('/projects/:name/files', this.fileManager.listFiles.bind(this.fileManager));
        this.app.post('/projects/:name/files', this.fileManager.uploadFiles.bind(this.fileManager));
        this.app.get('/projects/:name/files/*', this.fileManager.downloadFile.bind(this.fileManager));
        this.app.delete('/projects/:name/files/*', this.fileManager.deleteFile.bind(this.fileManager));

        this.app.post('/projects/:name/snapshot', this.snapshotManager.createSnapshot.bind(this.snapshotManager));
        this.app.get('/projects/:name/snapshots', this.snapshotManager.listSnapshots.bind(this.snapshotManager));
        this.app.post('/projects/:name/restore/:snapshotId', this.snapshotManager.restoreSnapshot.bind(this.snapshotManager));

        this.app.use((err, req, res, next) => {
            console.error('Error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    async start() {
        try {
            await this.loadConfig();
            this.setupMiddleware();
            this.initializeManagers();
            this.setupRoutes();

            this.app.listen(this.config.port, () => {
                console.log(`Tragarz Server running on port ${this.config.port}`);
                console.log(`Projects directory: ${path.resolve(this.config.dataDir)}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    const server = new TragarzServer();
    server.start();
}

module.exports = TragarzServer;