const fs = require('fs-extra');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configFile = '.tragarz.json';
        this.ignoreFile = '.tragarzignore';
    }

    getConfigPath(workingDir = process.cwd()) {
        return path.join(workingDir, this.configFile);
    }

    getIgnorePath(workingDir = process.cwd()) {
        return path.join(workingDir, this.ignoreFile);
    }

    async exists(workingDir = process.cwd()) {
        const configPath = this.getConfigPath(workingDir);
        return await fs.pathExists(configPath);
    }

    async load(workingDir = process.cwd()) {
        const configPath = this.getConfigPath(workingDir);

        if (!await fs.pathExists(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }

        try {
            const config = await fs.readJson(configPath);
            this.validateConfig(config);
            return config;
        } catch (error) {
            throw new Error(`Failed to load configuration: ${error.message}`);
        }
    }

    async save(config, workingDir = process.cwd()) {
        const configPath = this.getConfigPath(workingDir);

        try {
            this.validateConfig(config);
            config.lastSync = new Date().toISOString();
            await fs.writeJson(configPath, config, { spaces: 2 });
            return configPath;
        } catch (error) {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }

    async create(projectName, serverUrl, token, workingDir = process.cwd()) {
        const config = {
            projectName,
            serverUrl: this.normalizeUrl(serverUrl),
            token,
            lastSync: new Date().toISOString(),
            files: {}
        };

        await this.save(config, workingDir);
        return config;
    }

    async updateFiles(fileHashes, workingDir = process.cwd()) {
        const config = await this.load(workingDir);
        config.files = { ...config.files, ...fileHashes };
        await this.save(config, workingDir);
        return config;
    }

    async removeFiles(filePaths, workingDir = process.cwd()) {
        const config = await this.load(workingDir);

        for (const filePath of filePaths) {
            delete config.files[filePath];
        }

        await this.save(config, workingDir);
        return config;
    }

    validateConfig(config) {
        const required = ['projectName', 'serverUrl', 'token'];

        for (const field of required) {
            if (!config[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (typeof config.projectName !== 'string' || config.projectName.length === 0) {
            throw new Error('Project name must be a non-empty string');
        }

        if (!this.isValidUrl(config.serverUrl)) {
            throw new Error('Server URL must be a valid HTTP/HTTPS URL');
        }

        if (typeof config.token !== 'string' || config.token.length === 0) {
            throw new Error('Token must be a non-empty string');
        }

        if (!config.files || typeof config.files !== 'object') {
            config.files = {};
        }
    }

    isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    normalizeUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Use http:// for localhost, https:// for other domains
            const protocol = url.includes('localhost') || url.startsWith('127.0.0.1') || url.startsWith('192.168.') || url.startsWith('10.') ? 'http://' : 'https://';
            return `${protocol}${url}`;
        }
        return url.replace(/\/$/, '');
    }

    async createDefaultIgnore(workingDir = process.cwd()) {
        const ignorePath = this.getIgnorePath(workingDir);

        if (await fs.pathExists(ignorePath)) {
            return ignorePath;
        }

        const defaultIgnore = `# Tragarz ignore file
# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Version control
.git/
.svn/
.hg/
.bzr/

# Dependencies
node_modules/
bower_components/
vendor/

# Build outputs
dist/
build/
out/
target/

# Logs
*.log
logs/

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Configuration files that shouldn't be synced
${this.configFile}
${this.ignoreFile}
`;

        await fs.writeFile(ignorePath, defaultIgnore, 'utf8');
        return ignorePath;
    }

    async getProjectInfo(workingDir = process.cwd()) {
        if (!await this.exists(workingDir)) {
            return null;
        }

        try {
            const config = await this.load(workingDir);
            return {
                projectName: config.projectName,
                serverUrl: config.serverUrl,
                lastSync: config.lastSync,
                fileCount: Object.keys(config.files || {}).length
            };
        } catch (error) {
            return null;
        }
    }
}

module.exports = ConfigManager;