const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const ConfigManager = require('../config');
const ApiClient = require('../api');
const FileSyncManager = require('../fileSync');

class PullCommand {
    constructor() {
        this.configManager = new ConfigManager();
        this.fileSyncManager = new FileSyncManager();
    }

    async execute(options = {}) {
        const workingDir = options.cwd || process.cwd();

        try {
            if (!await this.configManager.exists(workingDir)) {
                throw new Error('Not a Tragarz project. Run `yonhub connect` first.');
            }

            const config = await this.configManager.load(workingDir);
            const apiClient = new ApiClient(config.serverUrl, config.token);

            console.log(chalk.cyan(`📥 Pulling from project: ${config.projectName}`));

            const spinner = ora('Getting server files...').start();

            const serverFiles = await apiClient.getProjectFiles(config.projectName);

            spinner.text = 'Scanning local files...';

            const localFiles = await this.fileSyncManager.scanLocalFiles(workingDir);

            spinner.text = 'Comparing files...';

            const changes = this.fileSyncManager.compareWithServer(
                localFiles,
                serverFiles,
                config.files || {}
            );

            spinner.stop();

            if (changes.conflicts.length > 0) {
                console.log(chalk.yellow('⚠️  Conflicts detected:'));
                for (const conflict of changes.conflicts) {
                    console.log(chalk.red(`   ${conflict.file}`));
                    console.log(chalk.gray(`     Local: ${conflict.localHash.substring(0, 8)}`));
                    console.log(chalk.gray(`     Server: ${conflict.serverHash.substring(0, 8)}`));
                }
                console.log('');

                if (options.backup) {
                    console.log(chalk.yellow('🔄 Creating backup and pulling server files...'));
                    await this.createBackup(changes.conflicts.map(c => c.file), workingDir);
                    changes.toDownload.push(...changes.conflicts.map(c => ({
                        relativePath: c.file,
                        serverFile: c.serverFile
                    })));
                    changes.conflicts = [];
                } else if (options.force) {
                    console.log(chalk.yellow('🔄 Force mode: overwriting local files...'));
                    changes.toDownload.push(...changes.conflicts.map(c => ({
                        relativePath: c.file,
                        serverFile: c.serverFile
                    })));
                    changes.conflicts = [];
                } else {
                    console.log(chalk.yellow('Please resolve conflicts manually, use --force to overwrite local files, or --backup to backup local files first.'));
                    process.exit(1);
                }
            }

            const totalChanges = changes.toDownload.length + changes.toUpload.length;

            if (totalChanges === 0) {
                console.log(chalk.green('✅ Everything is up to date!'));
                console.log(`   Local files: ${localFiles.size}`);
                return;
            }

            console.log('');
            console.log(chalk.cyan('📋 Changes to pull:'));

            if (changes.toDownload.length > 0) {
                console.log(chalk.green(`   📥 Download: ${changes.toDownload.length} files`));
                if (options.verbose) {
                    changes.toDownload.forEach(change => {
                        console.log(chalk.gray(`      + ${change.relativePath}`));
                    });
                }
            }

            if (changes.toUpload.length > 0 && !options.downloadOnly) {
                console.log(chalk.blue(`   📤 New local files: ${changes.toUpload.length} files`));
                if (options.verbose) {
                    changes.toUpload.forEach(file => {
                        console.log(chalk.gray(`      * ${file.relativePath}`));
                    });
                }
            }

            console.log('');

            if (!options.yes) {
                const readline = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                const answer = await new Promise(resolve => {
                    readline.question(chalk.cyan('Continue with pull? (y/N): '), resolve);
                });

                readline.close();

                if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                    console.log(chalk.yellow('Pull cancelled.'));
                    return;
                }
            }

            const totalFiles = changes.toDownload.length;
            let downloadedFiles = 0;
            const newFileHashes = {};

            if (changes.toDownload.length > 0) {
                const downloadSpinner = ora(`Downloading files (0/${totalFiles})...`).start();

                try {
                    for (const change of changes.toDownload) {
                        const localPath = path.join(workingDir, change.relativePath);

                        await apiClient.downloadFile(
                            config.projectName,
                            change.relativePath,
                            localPath
                        );

                        const hash = await this.fileSyncManager.calculateFileHash(localPath);
                        newFileHashes[change.relativePath] = hash;

                        downloadedFiles++;
                        downloadSpinner.text = `Downloading files (${downloadedFiles}/${totalFiles})...`;
                    }

                    downloadSpinner.succeed(`Downloaded ${downloadedFiles} files`);
                } catch (error) {
                    downloadSpinner.fail('Download failed');
                    throw error;
                }
            }

            // Remove files that no longer exist on server
            const filesToRemove = [];
            const serverFileMap = new Map();
            this.fileSyncManager.flattenServerFiles(serverFiles, '', serverFileMap);

            for (const [relativePath] of localFiles) {
                if (!serverFileMap.has(relativePath) && config.files && config.files[relativePath]) {
                    filesToRemove.push(relativePath);
                }
            }

            if (filesToRemove.length > 0 && !options.keepLocal) {
                const removeSpinner = ora('Removing deleted files...').start();

                try {
                    for (const filePath of filesToRemove) {
                        const fullPath = path.join(workingDir, filePath);
                        if (await fs.pathExists(fullPath)) {
                            await fs.remove(fullPath);
                            await this.fileSyncManager.cleanupEmptyDirectories(
                                path.dirname(fullPath),
                                workingDir
                            );
                        }
                    }

                    removeSpinner.succeed(`Removed ${filesToRemove.length} deleted files`);
                } catch (error) {
                    removeSpinner.warn(`Warning: Could not remove some files: ${error.message}`);
                }
            }

            // Update configuration with current file hashes
            const currentLocalFiles = await this.fileSyncManager.scanLocalFiles(workingDir);
            const allCurrentHashes = await this.fileSyncManager.createFileHashes(currentLocalFiles);
            await this.configManager.updateFiles(allCurrentHashes, workingDir);

            console.log('');
            console.log(chalk.green('✅ Pull completed successfully!'));
            console.log(`   Downloaded: ${changes.toDownload.length} files`);
            if (filesToRemove.length > 0 && !options.keepLocal) {
                console.log(`   Removed: ${filesToRemove.length} files`);
            }
            console.log(`   Total local files: ${currentLocalFiles.size}`);

        } catch (error) {
            console.log(chalk.red(`❌ Pull failed: ${error.message}`));
            process.exit(1);
        }
    }

    async createBackup(conflictFiles, workingDir) {
        const backupDir = path.join(workingDir, '.yonhub-backup', new Date().toISOString().replace(/[:.]/g, '-'));
        await fs.ensureDir(backupDir);

        for (const filePath of conflictFiles) {
            const sourcePath = path.join(workingDir, filePath);
            if (await fs.pathExists(sourcePath)) {
                await this.fileSyncManager.createBackup(sourcePath, backupDir);
            }
        }

        console.log(chalk.blue(`📦 Created backup at: ${backupDir}`));
        return backupDir;
    }
}

module.exports = PullCommand;