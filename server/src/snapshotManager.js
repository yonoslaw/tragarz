const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const { v4: uuidv4 } = require('uuid');

class SnapshotManager {
    constructor(dataDir) {
        this.dataDir = path.resolve(dataDir);
    }

    validateProjectExists(projectName) {
        const projectPath = path.join(this.dataDir, projectName);
        return fs.pathExists(projectPath);
    }

    getSnapshotsPath(projectName) {
        return path.join(this.dataDir, projectName, 'snapshots');
    }

    getSnapshotPath(projectName, snapshotId) {
        return path.join(this.getSnapshotsPath(projectName), `${snapshotId}.zip`);
    }

    getSnapshotMetadataPath(projectName, snapshotId) {
        return path.join(this.getSnapshotsPath(projectName), `${snapshotId}.json`);
    }

    getProjectFilesPath(projectName) {
        return path.join(this.dataDir, projectName, 'files');
    }

    async createSnapshot(req, res) {
        try {
            const { name: projectName } = req.params;
            const { description = '' } = req.body;

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const filesPath = this.getProjectFilesPath(projectName);
            if (!await fs.pathExists(filesPath)) {
                return res.status(400).json({ error: 'No files to snapshot' });
            }

            const snapshotId = uuidv4();
            const snapshotsPath = this.getSnapshotsPath(projectName);
            await fs.ensureDir(snapshotsPath);

            const snapshotZipPath = this.getSnapshotPath(projectName, snapshotId);
            const snapshotMetadataPath = this.getSnapshotMetadataPath(projectName, snapshotId);

            const metadata = {
                id: snapshotId,
                projectName,
                description,
                createdAt: new Date().toISOString(),
                fileCount: 0,
                size: 0
            };

            const archive = archiver('zip', { zlib: { level: 9 } });
            const output = fs.createWriteStream(snapshotZipPath);

            return new Promise((resolve, reject) => {
                output.on('close', async () => {
                    try {
                        const stat = await fs.stat(snapshotZipPath);
                        metadata.size = stat.size;
                        metadata.fileCount = archive.pointer();

                        await fs.writeJson(snapshotMetadataPath, metadata, { spaces: 2 });

                        res.json({
                            success: true,
                            snapshot: metadata
                        });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                archive.on('error', (error) => {
                    console.error('Archive error:', error);
                    reject(error);
                });

                archive.pipe(output);
                archive.directory(filesPath, false);
                archive.finalize();
            }).catch((error) => {
                console.error('Error creating snapshot:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to create snapshot' });
                }
            });
        } catch (error) {
            console.error('Error in createSnapshot:', error);
            res.status(500).json({ error: 'Failed to create snapshot' });
        }
    }

    async listSnapshots(req, res) {
        try {
            const { name: projectName } = req.params;

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const snapshotsPath = this.getSnapshotsPath(projectName);
            if (!await fs.pathExists(snapshotsPath)) {
                return res.json({
                    success: true,
                    snapshots: [],
                    projectName
                });
            }

            const files = await fs.readdir(snapshotsPath);
            const snapshots = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const metadataPath = path.join(snapshotsPath, file);
                        const metadata = await fs.readJson(metadataPath);

                        const zipPath = this.getSnapshotPath(projectName, metadata.id);
                        if (await fs.pathExists(zipPath)) {
                            snapshots.push(metadata);
                        } else {
                            console.warn(`Orphaned metadata file: ${file}`);
                            await fs.remove(metadataPath);
                        }
                    } catch (error) {
                        console.warn(`Failed to read snapshot metadata ${file}:`, error.message);
                    }
                }
            }

            snapshots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            res.json({
                success: true,
                snapshots,
                projectName,
                count: snapshots.length
            });
        } catch (error) {
            console.error('Error listing snapshots:', error);
            res.status(500).json({ error: 'Failed to list snapshots' });
        }
    }

    async restoreSnapshot(req, res) {
        try {
            const { name: projectName, snapshotId } = req.params;
            const { backup = true } = req.body;

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const snapshotZipPath = this.getSnapshotPath(projectName, snapshotId);
            const snapshotMetadataPath = this.getSnapshotMetadataPath(projectName, snapshotId);

            if (!await fs.pathExists(snapshotZipPath) || !await fs.pathExists(snapshotMetadataPath)) {
                return res.status(404).json({ error: 'Snapshot not found' });
            }

            const metadata = await fs.readJson(snapshotMetadataPath);
            const filesPath = this.getProjectFilesPath(projectName);

            let backupId = null;
            if (backup && await fs.pathExists(filesPath)) {
                const backupDescription = `Auto backup before restoring snapshot ${snapshotId}`;
                backupId = await this.createBackupSnapshot(projectName, backupDescription);
            }

            if (await fs.pathExists(filesPath)) {
                await fs.remove(filesPath);
            }
            await fs.ensureDir(filesPath);

            await extractZip(snapshotZipPath, { dir: filesPath });

            res.json({
                success: true,
                restored: metadata,
                backupId: backupId
            });
        } catch (error) {
            console.error('Error restoring snapshot:', error);
            res.status(500).json({ error: 'Failed to restore snapshot' });
        }
    }

    async createBackupSnapshot(projectName, description) {
        try {
            const snapshotId = uuidv4();
            const snapshotsPath = this.getSnapshotsPath(projectName);
            const filesPath = this.getProjectFilesPath(projectName);

            const snapshotZipPath = this.getSnapshotPath(projectName, snapshotId);
            const snapshotMetadataPath = this.getSnapshotMetadataPath(projectName, snapshotId);

            const metadata = {
                id: snapshotId,
                projectName,
                description,
                createdAt: new Date().toISOString(),
                isAutoBackup: true,
                fileCount: 0,
                size: 0
            };

            const archive = archiver('zip', { zlib: { level: 9 } });
            const output = fs.createWriteStream(snapshotZipPath);

            return new Promise((resolve, reject) => {
                output.on('close', async () => {
                    try {
                        const stat = await fs.stat(snapshotZipPath);
                        metadata.size = stat.size;
                        metadata.fileCount = archive.pointer();

                        await fs.writeJson(snapshotMetadataPath, metadata, { spaces: 2 });
                        resolve(snapshotId);
                    } catch (error) {
                        reject(error);
                    }
                });

                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(filesPath, false);
                archive.finalize();
            });
        } catch (error) {
            console.error('Error creating backup snapshot:', error);
            throw error;
        }
    }

    async deleteSnapshot(projectName, snapshotId) {
        try {
            const snapshotZipPath = this.getSnapshotPath(projectName, snapshotId);
            const snapshotMetadataPath = this.getSnapshotMetadataPath(projectName, snapshotId);

            await Promise.all([
                fs.remove(snapshotZipPath),
                fs.remove(snapshotMetadataPath)
            ]);

            return true;
        } catch (error) {
            console.error('Error deleting snapshot:', error);
            throw error;
        }
    }
}

module.exports = SnapshotManager;