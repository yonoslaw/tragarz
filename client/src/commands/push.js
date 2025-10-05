const chalk = require('chalk');
const ora = require('ora');
const ConfigManager = require('../config');
const ApiClient = require('../api');
const FileSyncManager = require('../fileSync');

class PushCommand {
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

            console.log(chalk.cyan(`📤 Pushing to project: ${config.projectName}`));

            const spinner = ora('Scanning local files...').start();

            const localFiles = await this.fileSyncManager.scanLocalFiles(workingDir);
            const localFileCount = localFiles.size;

            spinner.text = 'Getting server files...';

            const serverFiles = await apiClient.getProjectFiles(config.projectName);

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
                console.log(chalk.yellow('Please resolve conflicts manually or use --force to overwrite server files.'));

                if (!options.force) {
                    process.exit(1);
                }

                console.log(chalk.yellow('🔄 Force mode: overwriting server files...'));
                changes.toUpload.push(...changes.conflicts.map(c =>
                    localFiles.get(c.file)
                ));
                changes.conflicts = [];
            }

            const totalChanges = changes.toUpload.length + changes.toDelete.length;

            if (totalChanges === 0) {
                console.log(chalk.green('✅ Everything is up to date!'));
                console.log(`   Local files: ${localFileCount}`);
                return;
            }

            console.log('');
            console.log(chalk.cyan('📋 Changes to push:'));

            if (changes.toUpload.length > 0) {
                console.log(chalk.green(`   📤 Upload: ${changes.toUpload.length} files`));
                if (options.verbose) {
                    changes.toUpload.forEach(file => {
                        console.log(chalk.gray(`      + ${file.relativePath}`));
                    });
                }
            }

            if (changes.toDelete.length > 0) {
                console.log(chalk.red(`   🗑️  Delete: ${changes.toDelete.length} files`));
                if (options.verbose) {
                    changes.toDelete.forEach(filePath => {
                        console.log(chalk.gray(`      - ${filePath}`));
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
                    readline.question(chalk.cyan('Continue with push? (y/N): '), resolve);
                });

                readline.close();

                if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                    console.log(chalk.yellow('Push cancelled.'));
                    return;
                }
            }

            const totalFiles = changes.toUpload.length;
            let uploadedFiles = 0;
            const newFileHashes = {};

            if (changes.toUpload.length > 0) {
                const uploadSpinner = ora(`Uploading files (0/${totalFiles})...`).start();

                try {
                    const batchSize = 10;
                    const batches = [];

                    for (let i = 0; i < changes.toUpload.length; i += batchSize) {
                        batches.push(changes.toUpload.slice(i, i + batchSize));
                    }

                    for (const batch of batches) {
                        const result = await apiClient.uploadFiles(config.projectName, batch);

                        for (const uploadedFile of result.uploaded || []) {
                            const localFile = batch.find(f => f.relativePath === uploadedFile.path);
                            if (localFile) {
                                newFileHashes[uploadedFile.path] = localFile.hash;
                            }
                        }

                        uploadedFiles += batch.length;
                        uploadSpinner.text = `Uploading files (${uploadedFiles}/${totalFiles})...`;
                    }

                    uploadSpinner.succeed(`Uploaded ${uploadedFiles} files`);
                } catch (error) {
                    uploadSpinner.fail('Upload failed');
                    throw error;
                }
            }

            if (changes.toDelete.length > 0) {
                const deleteSpinner = ora('Deleting files...').start();

                try {
                    for (const filePath of changes.toDelete) {
                        await apiClient.deleteFile(config.projectName, filePath);
                        delete newFileHashes[filePath];
                    }

                    deleteSpinner.succeed(`Deleted ${changes.toDelete.length} files`);
                } catch (error) {
                    deleteSpinner.fail('Delete failed');
                    throw error;
                }
            }

            const allCurrentHashes = await this.fileSyncManager.createFileHashes(localFiles);
            await this.configManager.updateFiles(allCurrentHashes, workingDir);

            console.log('');
            console.log(chalk.green('✅ Push completed successfully!'));
            console.log(`   Uploaded: ${changes.toUpload.length} files`);
            console.log(`   Deleted: ${changes.toDelete.length} files`);
            console.log(`   Total files: ${localFileCount}`);

        } catch (error) {
            console.log(chalk.red(`❌ Push failed: ${error.message}`));
            process.exit(1);
        }
    }
}

module.exports = PushCommand;