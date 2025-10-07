#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const command = process.argv[2];

async function init() {
    const cwd = process.cwd();
    const configPath = path.join(cwd, 'tragarzserver.json');
    const dataDir = path.join(cwd, 'projects');

    if (await fs.pathExists(configPath)) {
        console.log('❌ Configuration already exists:', configPath);
        console.log('Remove it first if you want to reinitialize.');
        process.exit(1);
    }

    const config = {
        port: 8080,
        password: 'admin123',
        dataDir: './projects',
        maxProjectSize: '1GB',
        allowedHosts: ['*']
    };

    await fs.writeJson(configPath, config, { spaces: 2 });
    await fs.ensureDir(dataDir);

    console.log('✅ Tragarz Server initialized!');
    console.log('');
    console.log('Configuration file:', configPath);
    console.log('Projects directory:', dataDir);
    console.log('');
    console.log('📝 Edit tragarzserver.json to customize settings');
    console.log('🚀 Run "tragarz-server start" to start the server');
}

async function start() {
    const cwd = process.cwd();
    const configPath = path.join(cwd, 'tragarzserver.json');

    if (!await fs.pathExists(configPath)) {
        console.log('❌ Configuration not found:', configPath);
        console.log('');
        console.log('Run "tragarz-server init" first to initialize the server in this directory.');
        process.exit(1);
    }

    process.chdir(cwd);

    const TragarzServer = require('../src/server');
    const server = new TragarzServer();
    server.start();
}

function showHelp() {
    console.log('Tragarz Server - Lightweight file synchronization server');
    console.log('');
    console.log('Usage:');
    console.log('  tragarz-server init    Initialize server in current directory');
    console.log('  tragarz-server start   Start the server');
    console.log('  tragarz-server help    Show this help message');
    console.log('');
    console.log('Workflow:');
    console.log('  1. cd ~/my-tragarz-server');
    console.log('  2. tragarz-server init');
    console.log('  3. Edit tragarzserver.json (optional)');
    console.log('  4. tragarz-server start');
}

async function main() {
    switch (command) {
        case 'init':
            await init();
            break;
        case 'start':
            await start();
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        default:
            if (command) {
                console.log('❌ Unknown command:', command);
                console.log('');
            }
            showHelp();
            process.exit(command ? 1 : 0);
    }
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
