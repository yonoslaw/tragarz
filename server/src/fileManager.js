const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

class FileManager {
    constructor(dataDir) {
        this.dataDir = path.resolve(dataDir);
        this.upload = this.setupMulter();
    }

    setupMulter() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const projectName = req.params.name;
                const filesPath = path.join(this.dataDir, projectName, 'files');
                cb(null, filesPath);
            },
            filename: (req, file, cb) => {
                const relativePath = file.originalname;
                const sanitizedPath = this.sanitizeFilePath(relativePath);
                cb(null, sanitizedPath);
            }
        });

        return multer({
            storage,
            limits: {
                fileSize: 100 * 1024 * 1024
            },
            fileFilter: (req, file, cb) => {
                if (this.isValidFilePath(file.originalname)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file path'), false);
                }
            }
        });
    }

    sanitizeFilePath(filePath) {
        return path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    }

    isValidFilePath(filePath) {
        const normalized = path.normalize(filePath);
        return !normalized.includes('..') && !path.isAbsolute(normalized);
    }

    validateProjectExists(projectName) {
        const projectPath = path.join(this.dataDir, projectName);
        return fs.pathExists(projectPath);
    }

    async listFiles(req, res) {
        try {
            const { name: projectName } = req.params;

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const filesPath = path.join(this.dataDir, projectName, 'files');
            await fs.ensureDir(filesPath);

            const files = await this.getFileTree(filesPath);

            res.json({
                success: true,
                files,
                projectName
            });
        } catch (error) {
            console.error('Error listing files:', error);
            res.status(500).json({ error: 'Failed to list files' });
        }
    }

    async getFileTree(dirPath, relativePath = '') {
        const files = [];

        try {
            const items = await fs.readdir(dirPath);

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const itemRelativePath = path.join(relativePath, item);
                const stat = await fs.stat(itemPath);

                if (stat.isFile()) {
                    const hash = await this.calculateFileHash(itemPath);
                    files.push({
                        path: itemRelativePath.replace(/\\/g, '/'),
                        size: stat.size,
                        modified: stat.mtime,
                        hash,
                        type: 'file'
                    });
                } else if (stat.isDirectory()) {
                    const subFiles = await this.getFileTree(itemPath, itemRelativePath);
                    files.push({
                        path: itemRelativePath.replace(/\\/g, '/'),
                        type: 'directory',
                        children: subFiles
                    });
                }
            }
        } catch (error) {
            console.warn(`Error reading directory ${dirPath}:`, error.message);
        }

        return files.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.path.localeCompare(b.path);
        });
    }

    async calculateFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    async uploadFiles(req, res) {
        try {
            const { name: projectName } = req.params;

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const filesPath = path.join(this.dataDir, projectName, 'files');
            await fs.ensureDir(filesPath);

            this.upload.array('files')(req, res, async (err) => {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(400).json({ error: err.message });
                }

                try {
                    const uploadedFiles = [];

                    for (const file of req.files || []) {
                        const relativePath = file.originalname;
                        const fullPath = path.join(filesPath, this.sanitizeFilePath(relativePath));

                        await fs.ensureDir(path.dirname(fullPath));

                        if (file.path !== fullPath) {
                            await fs.move(file.path, fullPath, { overwrite: true });
                        }

                        const hash = await this.calculateFileHash(fullPath);
                        const stat = await fs.stat(fullPath);

                        uploadedFiles.push({
                            path: relativePath,
                            size: stat.size,
                            hash,
                            uploaded: true
                        });
                    }

                    res.json({
                        success: true,
                        uploaded: uploadedFiles,
                        count: uploadedFiles.length
                    });
                } catch (processingError) {
                    console.error('File processing error:', processingError);
                    res.status(500).json({ error: 'Failed to process uploaded files' });
                }
            });
        } catch (error) {
            console.error('Error in uploadFiles:', error);
            res.status(500).json({ error: 'Failed to upload files' });
        }
    }

    async downloadFile(req, res) {
        try {
            const { name: projectName } = req.params;
            const filePath = req.params[0];

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (!this.isValidFilePath(filePath)) {
                return res.status(400).json({ error: 'Invalid file path' });
            }

            const fullPath = path.join(this.dataDir, projectName, 'files', filePath);

            if (!await fs.pathExists(fullPath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            const stat = await fs.stat(fullPath);
            if (!stat.isFile()) {
                return res.status(400).json({ error: 'Path is not a file' });
            }

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
            res.setHeader('Content-Length', stat.size);

            const stream = fs.createReadStream(fullPath);
            stream.pipe(res);

            stream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to download file' });
                }
            });
        } catch (error) {
            console.error('Error downloading file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to download file' });
            }
        }
    }

    async deleteFile(req, res) {
        try {
            const { name: projectName } = req.params;
            const filePath = req.params[0];

            if (!await this.validateProjectExists(projectName)) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (!this.isValidFilePath(filePath)) {
                return res.status(400).json({ error: 'Invalid file path' });
            }

            const fullPath = path.join(this.dataDir, projectName, 'files', filePath);

            if (!await fs.pathExists(fullPath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            await fs.remove(fullPath);

            const parentDir = path.dirname(fullPath);
            await this.cleanupEmptyDirectories(parentDir, path.join(this.dataDir, projectName, 'files'));

            res.json({
                success: true,
                deleted: filePath
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    }

    async cleanupEmptyDirectories(dirPath, rootPath) {
        try {
            if (dirPath === rootPath || !dirPath.startsWith(rootPath)) {
                return;
            }

            const items = await fs.readdir(dirPath);
            if (items.length === 0) {
                await fs.rmdir(dirPath);
                await this.cleanupEmptyDirectories(path.dirname(dirPath), rootPath);
            }
        } catch (error) {
            console.warn('Error cleaning up empty directories:', error.message);
        }
    }
}

module.exports = FileManager;