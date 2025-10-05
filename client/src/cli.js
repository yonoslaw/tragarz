#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const ConfigManager = require('./config');
const ConnectCommand = require('./commands/connect');
const PushCommand = require('./commands/push');
const PullCommand = require('./commands/pull');
const MemoryCommand = require('./commands/memory');

const configManager = new ConfigManager();
const connectCommand = new ConnectCommand();
const pushCommand = new PushCommand();
const pullCommand = new PullCommand();
const memoryCommand = new MemoryCommand();

program
    .name('tragarz')
    .description('Tragarz file synchronization client')
    .version('1.0.0');

program
    .command('connect')
    .description('Connect to a Tragarz project')
    .argument('<project-name>', 'Project name')
    .argument('<server-url>', 'Server URL')
    .argument('<password>', 'Server password')
    .option('-f, --force', 'Overwrite existing configuration')
    .option('-d, --description <desc>', 'Project description for new projects')
    .option('--no-download', 'Skip downloading existing files')
    .action(async (projectName, serverUrl, password, options) => {
        try {
            await connectCommand.execute(projectName, serverUrl, password, options);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('push')
    .description('Upload local changes to server')
    .option('-f, --force', 'Force upload, overwriting server conflicts')
    .option('-v, --verbose', 'Show detailed file list')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options) => {
        try {
            await pushCommand.execute(options);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('pull')
    .description('Download changes from server')
    .option('-f, --force', 'Force download, overwriting local conflicts')
    .option('-b, --backup', 'Create backup of conflicted local files')
    .option('-v, --verbose', 'Show detailed file list')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--keep-local', 'Keep local files that were deleted on server')
    .option('--download-only', 'Only download, don\'t show local-only files')
    .action(async (options) => {
        try {
            await pullCommand.execute(options);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('memory')
    .description('Create, list or restore project snapshots')
    .argument('[description]', 'Snapshot description')
    .option('-l, --list', 'List all snapshots')
    .option('-r, --restore <snapshot-id>', 'Restore from snapshot')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--no-backup', 'Don\'t create backup when restoring')
    .action(async (description, options) => {
        try {
            await memoryCommand.execute(description, options);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('status')
    .description('Show project status and information')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
        try {
            await showStatus(options);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('init')
    .description('Initialize a new Tragarz project (alias for connect)')
    .argument('<project-name>', 'Project name')
    .argument('<server-url>', 'Server URL')
    .argument('<password>', 'Server password')
    .option('-d, --description <desc>', 'Project description')
    .action(async (projectName, serverUrl, password, options) => {
        try {
            console.log(chalk.blue('🚀 Initializing Tragarz project...'));
            await connectCommand.execute(projectName, serverUrl, password, options);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

async function showStatus(options = {}) {
    const workingDir = process.cwd();

    try {
        if (!await configManager.exists(workingDir)) {
            console.log(chalk.yellow('❓ Not a Tragarz project'));
            console.log(chalk.gray('   Run `tragarz connect` to initialize a project'));
            return;
        }

        const projectInfo = await configManager.getProjectInfo(workingDir);

        if (!projectInfo) {
            console.log(chalk.red('❌ Invalid project configuration'));
            return;
        }

        console.log(chalk.cyan('📋 Tragarz Project Status'));
        console.log('');
        console.log(`${chalk.green('✅')} Project: ${chalk.bold(projectInfo.projectName)}`);
        console.log(`${chalk.gray('🌐')} Server: ${projectInfo.serverUrl}`);
        console.log(`${chalk.gray('📅')} Last Sync: ${projectInfo.lastSync ? new Date(projectInfo.lastSync).toLocaleString() : 'Never'}`);
        console.log(`${chalk.gray('📁')} Tracked Files: ${projectInfo.fileCount}`);

        if (options.verbose) {
            console.log('');
            console.log(chalk.cyan('💡 Available Commands:'));
            console.log('   tragarz push        - Upload local changes');
            console.log('   tragarz pull        - Download server changes');
            console.log('   tragarz memory      - Create snapshot');
            console.log('   tragarz status      - Show this status');
        }

    } catch (error) {
        console.log(chalk.red(`❌ Status failed: ${error.message}`));
        process.exit(1);
    }
}

program.on('command:*', function (operands) {
    console.log(chalk.red(`Unknown command: ${operands[0]}`));
    console.log('');
    program.help();
});

// Show help when no arguments provided
if (process.argv.length <= 2) {
    console.log(chalk.cyan('🚀 Tragarz - File Synchronization Client'));
    console.log('');
    program.help();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error(chalk.red('💥 Unexpected error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('💥 Unhandled promise rejection:'), reason);
    if (process.env.NODE_ENV === 'development') {
        console.error(promise);
    }
    process.exit(1);
});

// Parse command line arguments
try {
    program.parse(process.argv);
} catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
}