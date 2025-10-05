const chalk = require('chalk');
const ora = require('ora');
const ConfigManager = require('../config');
const ApiClient = require('../api');
const FileSyncManager = require('../fileSync');

class ConnectCommand {
    constructor() {
        this.configManager = new ConfigManager();
        this.fileSyncManager = new FileSyncManager();
    }

    async execute(projectName, serverUrl, password, options = {}) {
        const workingDir = options.cwd || process.cwd();

        try {
            await this.validateInputs(projectName, serverUrl, password);

            if (await this.configManager.exists(workingDir)) {
                if (!options.force) {
                    throw new Error('Project already initialized. Use --force to overwrite.');
                }
                console.log(chalk.yellow('⚠️  Overwriting existing configuration...'));
            }

            const spinner = ora('Connecting to server...').start();

            const normalizedUrl = this.configManager.normalizeUrl(serverUrl);
            const apiClient = new ApiClient(normalizedUrl);

            let authResult;
            try {
                authResult = await apiClient.authenticate(password);
                spinner.succeed('Authentication successful');
            } catch (error) {
                spinner.fail('Authentication failed');
                throw error;
            }

            spinner.start('Checking project on server...');

            let projectExists = false;
            let projectInfo = null;

            try {
                projectInfo = await apiClient.getProjectInfo(projectName);
                projectExists = true;
                spinner.succeed(`Project "${projectName}" found on server`);
            } catch (error) {
                if (error.message.includes('404') || error.message.includes('not found')) {
                    spinner.info(`Project "${projectName}" not found, will create new project`);
                } else {
                    spinner.fail('Failed to check project');
                    throw error;
                }
            }

            if (!projectExists) {
                spinner.start('Creating new project...');
                try {
                    projectInfo = await apiClient.createProject(projectName, options.description || '');
                    spinner.succeed(`Created new project "${projectName}"`);
                } catch (error) {
                    spinner.fail('Failed to create project');
                    throw error;
                }
            }

            const config = await this.configManager.create(
                projectName,
                normalizedUrl,
                authResult.token,
                workingDir
            );

            await this.configManager.createDefaultIgnore(workingDir);

            if (projectExists && options.download !== false) {
                spinner.start('Downloading existing files...');
                try {
                    const downloadResult = await this.downloadProjectFiles(
                        apiClient,
                        projectName,
                        workingDir
                    );

                    if (downloadResult.fileCount > 0) {
                        await this.configManager.updateFiles(downloadResult.fileHashes, workingDir);
                        spinner.succeed(`Downloaded ${downloadResult.fileCount} files`);
                    } else {
                        spinner.info('No files to download');
                    }
                } catch (error) {
                    spinner.warn(`Warning: Could not download files: ${error.message}`);
                }
            }

            console.log(chalk.green('✅ Successfully connected to Tragarz!'));
            console.log('');
            console.log(chalk.cyan('Project Details:'));
            console.log(`  Name: ${projectName}`);
            console.log(`  Server: ${normalizedUrl}`);
            console.log(`  Status: ${projectExists ? 'Existing project' : 'New project'}`);
            console.log('');
            console.log(chalk.cyan('Next steps:'));
            console.log('  • Use `yonhub push` to upload your files');
            console.log('  • Use `yonhub pull` to download updates');
            console.log('  • Use `yonhub memory` to create snapshots');

        } catch (error) {
            console.log(chalk.red(`❌ Connection failed: ${error.message}`));
            process.exit(1);
        }
    }

    async validateInputs(projectName, serverUrl, password) {
        if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
            throw new Error('Project name is required');
        }

        if (!serverUrl || typeof serverUrl !== 'string' || serverUrl.trim().length === 0) {
            throw new Error('Server URL is required');
        }

        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            throw new Error('Password is required');
        }

        const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '');
        if (sanitizedName !== projectName) {
            throw new Error('Project name can only contain letters, numbers, hyphens and underscores');
        }

        if (projectName.length > 50) {
            throw new Error('Project name cannot be longer than 50 characters');
        }
    }

    async downloadProjectFiles(apiClient, projectName, workingDir) {
        const serverFiles = await apiClient.getProjectFiles(projectName);
        const fileHashes = {};
        let downloadedCount = 0;

        const downloadFile = async (file, basePath = '') => {
            const filePath = basePath ? `${basePath}/${file.path}` : file.path;

            if (file.type === 'file') {
                const localPath = require('path').join(workingDir, filePath);
                await apiClient.downloadFile(projectName, filePath, localPath);

                const hash = await this.fileSyncManager.calculateFileHash(localPath);
                fileHashes[filePath] = hash;
                downloadedCount++;
            } else if (file.type === 'directory' && file.children) {
                for (const child of file.children) {
                    await downloadFile(child, filePath);
                }
            }
        };

        for (const file of serverFiles) {
            await downloadFile(file);
        }

        return {
            fileCount: downloadedCount,
            fileHashes
        };
    }
}

module.exports = ConnectCommand;