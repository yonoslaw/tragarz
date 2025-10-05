const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { globby } = require('globby');
const ignore = require('ignore');

class FileSyncManager {
    constructor() {
        this.ignoreFile = '.yonhubignore';
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

    async loadIgnoreRules(workingDir = process.cwd()) {
        const ignorePath = path.join(workingDir, this.ignoreFile);
        const ig = ignore();

        if (await fs.pathExists(ignorePath)) {
            try {
                const content = await fs.readFile(ignorePath, 'utf8');
                ig.add(content);
            } catch (error) {
                console.warn(`Warning: Could not read ${this.ignoreFile}:`, error.message);
            }
        }

        ig.add([
            '.yonhub.json',
            '.yonhubignore',
            '.git/',
            'node_modules/',
            '.DS_Store'
        ]);

        return ig;
    }

    async scanLocalFiles(workingDir = process.cwd()) {
        try {
            const ig = await this.loadIgnoreRules(workingDir);

            const allFiles = await globby(['**/*'], {
                cwd: workingDir,
                dot: true,
                onlyFiles: true,
                followSymbolicLinks: false
            });

            const filteredFiles = allFiles.filter(file => !ig.ignores(file));
            const fileMap = new Map();

            for (const relativePath of filteredFiles) {
                const fullPath = path.join(workingDir, relativePath);

                try {
                    const stat = await fs.stat(fullPath);
                    const hash = await this.calculateFileHash(fullPath);

                    fileMap.set(relativePath, {
                        relativePath,
                        fullPath,
                        hash,
                        size: stat.size,
                        modified: stat.mtime
                    });
                } catch (error) {
                    console.warn(`Warning: Could not process file ${relativePath}:`, error.message);
                }
            }

            return fileMap;
        } catch (error) {
            throw new Error(`Failed to scan local files: ${error.message}`);
        }
    }

    compareWithServer(localFiles, serverFiles, lastKnownFiles = {}) {
        const changes = {
            toUpload: [],
            toDownload: [],
            toDelete: [],
            conflicts: []
        };

        const serverFileMap = new Map();
        this.flattenServerFiles(serverFiles, '', serverFileMap);

        for (const [relativePath, localFile] of localFiles) {
            const serverFile = serverFileMap.get(relativePath);
            const lastKnown = lastKnownFiles[relativePath];

            if (!serverFile) {
                changes.toUpload.push(localFile);
            } else if (localFile.hash !== serverFile.hash) {
                if (lastKnown && lastKnown !== localFile.hash && lastKnown !== serverFile.hash) {
                    changes.conflicts.push({
                        file: relativePath,
                        localHash: localFile.hash,
                        serverHash: serverFile.hash,
                        lastKnown
                    });
                } else if (!lastKnown || lastKnown === serverFile.hash) {
                    changes.toUpload.push(localFile);
                } else {
                    changes.toDownload.push({
                        relativePath,
                        serverFile
                    });
                }
            }
        }

        for (const [relativePath, serverFile] of serverFileMap) {
            if (!localFiles.has(relativePath)) {
                const lastKnown = lastKnownFiles[relativePath];
                if (lastKnown) {
                    changes.toDelete.push(relativePath);
                } else {
                    changes.toDownload.push({
                        relativePath,
                        serverFile
                    });
                }
            }
        }

        return changes;
    }

    flattenServerFiles(files, basePath = '', result = new Map()) {
        for (const file of files) {
            const fullPath = basePath ? path.join(basePath, file.path) : file.path;

            if (file.type === 'file') {
                result.set(fullPath.replace(/\\/g, '/'), {
                    path: fullPath.replace(/\\/g, '/'),
                    hash: file.hash,
                    size: file.size,
                    modified: new Date(file.modified)
                });
            } else if (file.type === 'directory' && file.children) {
                this.flattenServerFiles(file.children, fullPath, result);
            }
        }
        return result;
    }

    async createFileHashes(files) {
        const hashes = {};
        for (const [relativePath, fileInfo] of files) {
            hashes[relativePath] = fileInfo.hash;
        }
        return hashes;
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    async validateFile(filePath) {
        try {
            const stat = await fs.stat(filePath);
            return {
                exists: true,
                isFile: stat.isFile(),
                size: stat.size,
                modified: stat.mtime
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    async ensureDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);
    }

    async createBackup(filePath, backupDir) {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupPath = path.join(backupDir, relativePath);

        await this.ensureDirectoryExists(backupPath);
        await fs.copy(filePath, backupPath);

        return backupPath;
    }

    getRelativePath(fullPath, workingDir = process.cwd()) {
        return path.relative(workingDir, fullPath).replace(/\\/g, '/');
    }

    async cleanupEmptyDirectories(startDir, workingDir = process.cwd()) {
        try {
            const items = await fs.readdir(startDir);

            if (items.length === 0 && startDir !== workingDir) {
                await fs.rmdir(startDir);
                const parentDir = path.dirname(startDir);
                if (parentDir !== workingDir) {
                    await this.cleanupEmptyDirectories(parentDir, workingDir);
                }
            }
        } catch (error) {
            // Directory not empty or other error, ignore
        }
    }
}

module.exports = FileSyncManager;