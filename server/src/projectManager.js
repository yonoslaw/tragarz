const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class ProjectManager {
    constructor(dataDir) {
        this.dataDir = path.resolve(dataDir);
    }

    validateProjectName(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }

        const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '');
        return sanitized === name && name.length > 0 && name.length <= 50;
    }

    getProjectPath(name) {
        return path.join(this.dataDir, name);
    }

    getProjectFilesPath(name) {
        return path.join(this.getProjectPath(name), 'files');
    }

    getProjectSnapshotsPath(name) {
        return path.join(this.getProjectPath(name), 'snapshots');
    }

    getProjectMetadataPath(name) {
        return path.join(this.getProjectPath(name), 'metadata.json');
    }

    async listProjects(req, res) {
        try {
            await fs.ensureDir(this.dataDir);
            const items = await fs.readdir(this.dataDir);
            const projects = [];

            for (const item of items) {
                const projectPath = path.join(this.dataDir, item);
                const stat = await fs.stat(projectPath);

                if (stat.isDirectory()) {
                    const metadataPath = this.getProjectMetadataPath(item);
                    let metadata = {
                        name: item,
                        createdAt: stat.birthtime,
                        lastModified: stat.mtime
                    };

                    if (await fs.pathExists(metadataPath)) {
                        try {
                            const fileMetadata = await fs.readJson(metadataPath);
                            metadata = { ...metadata, ...fileMetadata };
                        } catch (error) {
                            console.warn(`Failed to read metadata for project ${item}:`, error.message);
                        }
                    }

                    projects.push(metadata);
                }
            }

            res.json({
                success: true,
                projects: projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
            });
        } catch (error) {
            console.error('Error listing projects:', error);
            res.status(500).json({ error: 'Failed to list projects' });
        }
    }

    async createProject(req, res) {
        try {
            const { name } = req.params;
            const { description } = req.body;

            if (!this.validateProjectName(name)) {
                return res.status(400).json({
                    error: 'Invalid project name. Use only letters, numbers, hyphens and underscores (max 50 chars)'
                });
            }

            const projectPath = this.getProjectPath(name);
            const filesPath = this.getProjectFilesPath(name);
            const snapshotsPath = this.getProjectSnapshotsPath(name);

            if (await fs.pathExists(projectPath)) {
                return res.status(409).json({ error: 'Project already exists' });
            }

            await fs.ensureDir(filesPath);
            await fs.ensureDir(snapshotsPath);

            const metadata = {
                name,
                description: description || '',
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                id: crypto.randomUUID(),
                fileCount: 0,
                totalSize: 0
            };

            await fs.writeJson(this.getProjectMetadataPath(name), metadata, { spaces: 2 });

            res.status(201).json({
                success: true,
                project: metadata
            });
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: 'Failed to create project' });
        }
    }

    async getProjectInfo(req, res) {
        try {
            const { name } = req.params;

            if (!this.validateProjectName(name)) {
                return res.status(400).json({ error: 'Invalid project name' });
            }

            const projectPath = this.getProjectPath(name);
            if (!await fs.pathExists(projectPath)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const metadataPath = this.getProjectMetadataPath(name);
            let metadata = {
                name,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                fileCount: 0,
                totalSize: 0
            };

            if (await fs.pathExists(metadataPath)) {
                try {
                    metadata = await fs.readJson(metadataPath);
                } catch (error) {
                    console.warn(`Failed to read metadata for project ${name}:`, error.message);
                }
            }

            const filesPath = this.getProjectFilesPath(name);
            if (await fs.pathExists(filesPath)) {
                const stats = await this.calculateProjectStats(filesPath);
                metadata.fileCount = stats.fileCount;
                metadata.totalSize = stats.totalSize;
                metadata.lastModified = new Date().toISOString();

                await fs.writeJson(metadataPath, metadata, { spaces: 2 });
            }

            res.json({
                success: true,
                project: metadata
            });
        } catch (error) {
            console.error('Error getting project info:', error);
            res.status(500).json({ error: 'Failed to get project info' });
        }
    }

    async calculateProjectStats(dirPath) {
        let fileCount = 0;
        let totalSize = 0;

        const calculateDir = async (currentPath) => {
            try {
                const items = await fs.readdir(currentPath);

                for (const item of items) {
                    const itemPath = path.join(currentPath, item);
                    const stat = await fs.stat(itemPath);

                    if (stat.isFile()) {
                        fileCount++;
                        totalSize += stat.size;
                    } else if (stat.isDirectory()) {
                        await calculateDir(itemPath);
                    }
                }
            } catch (error) {
                console.warn(`Error calculating stats for ${currentPath}:`, error.message);
            }
        };

        await calculateDir(dirPath);
        return { fileCount, totalSize };
    }

    async updateProjectMetadata(name, updates) {
        try {
            const metadataPath = this.getProjectMetadataPath(name);
            let metadata = {};

            if (await fs.pathExists(metadataPath)) {
                metadata = await fs.readJson(metadataPath);
            }

            metadata = {
                ...metadata,
                ...updates,
                lastModified: new Date().toISOString()
            };

            await fs.writeJson(metadataPath, metadata, { spaces: 2 });
            return metadata;
        } catch (error) {
            console.error('Error updating project metadata:', error);
            throw error;
        }
    }
}

module.exports = ProjectManager;