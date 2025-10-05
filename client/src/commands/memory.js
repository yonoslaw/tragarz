const chalk = require('chalk');
const ora = require('ora');
const ConfigManager = require('../config');
const ApiClient = require('../api');

class MemoryCommand {
    constructor() {
        this.configManager = new ConfigManager();
    }

    async execute(description = '', options = {}) {
        const workingDir = options.cwd || process.cwd();

        try {
            if (!await this.configManager.exists(workingDir)) {
                throw new Error('Not a Tragarz project. Run `yonhub connect` first.');
            }

            const config = await this.configManager.load(workingDir);
            const apiClient = new ApiClient(config.serverUrl, config.token);

            console.log(chalk.cyan(`📸 Creating snapshot for project: ${config.projectName}`));

            if (options.list) {
                await this.listSnapshots(apiClient, config.projectName);
                return;
            }

            if (options.restore) {
                await this.restoreSnapshot(apiClient, config.projectName, options.restore, options);
                return;
            }

            const spinner = ora('Creating snapshot...').start();

            try {
                const snapshot = await apiClient.createSnapshot(config.projectName, description);

                spinner.succeed('Snapshot created successfully!');

                console.log('');
                console.log(chalk.cyan('📋 Snapshot Details:'));
                console.log(`   ID: ${snapshot.id}`);
                console.log(`   Description: ${snapshot.description || '(no description)'}`);
                console.log(`   Created: ${new Date(snapshot.createdAt).toLocaleString()}`);
                console.log(`   Files: ${snapshot.fileCount || 0}`);
                console.log(`   Size: ${this.formatSize(snapshot.size || 0)}`);
                console.log('');
                console.log(chalk.green(`✅ Snapshot "${snapshot.id}" saved!`));
                console.log(chalk.gray(`   Use "yonhub memory --restore ${snapshot.id}" to restore this snapshot`));

            } catch (error) {
                spinner.fail('Failed to create snapshot');
                throw error;
            }

        } catch (error) {
            console.log(chalk.red(`❌ Memory operation failed: ${error.message}`));
            process.exit(1);
        }
    }

    async listSnapshots(apiClient, projectName) {
        const spinner = ora('Loading snapshots...').start();

        try {
            const snapshots = await apiClient.getSnapshots(projectName);

            spinner.stop();

            if (snapshots.length === 0) {
                console.log(chalk.yellow('📭 No snapshots found.'));
                console.log(chalk.gray('   Create your first snapshot with: yonhub memory "description"'));
                return;
            }

            console.log(chalk.cyan(`📋 Snapshots for ${projectName}:`));
            console.log('');

            snapshots.forEach((snapshot, index) => {
                const isAutoBackup = snapshot.isAutoBackup;
                const icon = isAutoBackup ? '🔄' : '📸';
                const typeLabel = isAutoBackup ? chalk.gray('[AUTO]') : '';

                console.log(`${icon} ${chalk.bold(snapshot.id)} ${typeLabel}`);
                console.log(`   ${chalk.gray('Description:')} ${snapshot.description || chalk.gray('(no description)')}`);
                console.log(`   ${chalk.gray('Created:')} ${new Date(snapshot.createdAt).toLocaleString()}`);
                console.log(`   ${chalk.gray('Files:')} ${snapshot.fileCount || 0}, ${chalk.gray('Size:')} ${this.formatSize(snapshot.size || 0)}`);

                if (index < snapshots.length - 1) {
                    console.log('');
                }
            });

            console.log('');
            console.log(chalk.cyan('💡 Commands:'));
            console.log('   yonhub memory "description"         - Create new snapshot');
            console.log('   yonhub memory --restore <id>        - Restore snapshot');

        } catch (error) {
            spinner.fail('Failed to load snapshots');
            throw error;
        }
    }

    async restoreSnapshot(apiClient, projectName, snapshotId, options = {}) {
        if (!snapshotId) {
            throw new Error('Snapshot ID is required for restore operation');
        }

        console.log(chalk.cyan(`🔄 Restoring snapshot: ${snapshotId}`));

        if (!options.yes) {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log(chalk.yellow('⚠️  This will replace all current files with the snapshot content.'));
            const createBackup = await new Promise(resolve => {
                readline.question(chalk.cyan('Create backup before restore? (Y/n): '), resolve);
            });

            const shouldCreateBackup = createBackup.toLowerCase() !== 'n' && createBackup.toLowerCase() !== 'no';

            const proceed = await new Promise(resolve => {
                readline.question(chalk.cyan('Continue with restore? (y/N): '), resolve);
            });

            readline.close();

            if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
                console.log(chalk.yellow('Restore cancelled.'));
                return;
            }

            options.backup = shouldCreateBackup;
        }

        const spinner = ora('Restoring snapshot...').start();

        try {
            const result = await apiClient.restoreSnapshot(projectName, snapshotId, options.backup);

            spinner.succeed('Snapshot restored successfully!');

            console.log('');
            console.log(chalk.cyan('📋 Restore Details:'));
            console.log(`   Restored: ${result.restored.id}`);
            console.log(`   Description: ${result.restored.description || '(no description)'}`);
            console.log(`   Original Date: ${new Date(result.restored.createdAt).toLocaleString()}`);

            if (result.backupId) {
                console.log(`   Backup Created: ${result.backupId}`);
            }

            console.log('');
            console.log(chalk.green('✅ Project restored to snapshot state!'));

            if (result.backupId) {
                console.log(chalk.blue(`📦 Previous state backed up as: ${result.backupId}`));
            }

            console.log(chalk.gray('   Run "yonhub pull" to sync your local configuration'));

        } catch (error) {
            spinner.fail('Failed to restore snapshot');
            throw error;
        }
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}

module.exports = MemoryCommand;