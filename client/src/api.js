const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

class ApiClient {
    constructor(serverUrl, token = null) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.token = token;
        this.client = axios.create({
            baseURL: this.serverUrl,
            timeout: 30000,
            headers: {
                'User-Agent': 'Tragarz-Client/1.0.0'
            }
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });

        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    const message = error.response.data?.error || error.message;
                    throw new Error(`Server error (${error.response.status}): ${message}`);
                } else if (error.request) {
                    throw new Error(`Connection failed: ${error.message}`);
                } else {
                    throw new Error(`Request error: ${error.message}`);
                }
            }
        );
    }

    setToken(token) {
        this.token = token;
    }

    async authenticate(password) {
        try {
            const response = await this.client.post('/auth', { password });
            this.token = response.data.token;
            return response.data;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async getProjects() {
        try {
            const response = await this.client.get('/projects');
            return response.data.projects || [];
        } catch (error) {
            throw new Error(`Failed to get projects: ${error.message}`);
        }
    }

    async createProject(name, description = '') {
        try {
            const response = await this.client.post(`/projects/${name}`, { description });
            return response.data.project;
        } catch (error) {
            throw new Error(`Failed to create project: ${error.message}`);
        }
    }

    async getProjectInfo(name) {
        try {
            const response = await this.client.get(`/projects/${name}/info`);
            return response.data.project;
        } catch (error) {
            throw new Error(`Failed to get project info: ${error.message}`);
        }
    }

    async getProjectFiles(name) {
        try {
            const response = await this.client.get(`/projects/${name}/files`);
            return response.data.files || [];
        } catch (error) {
            throw new Error(`Failed to get project files: ${error.message}`);
        }
    }

    async uploadFiles(projectName, files) {
        try {
            const formData = new FormData();

            for (const file of files) {
                const stream = fs.createReadStream(file.fullPath);
                formData.append('files', stream, {
                    filename: file.relativePath,
                    contentType: 'application/octet-stream'
                });
            }

            const response = await this.client.post(
                `/projects/${projectName}/files`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            return response.data;
        } catch (error) {
            throw new Error(`Failed to upload files: ${error.message}`);
        }
    }

    async downloadFile(projectName, filePath, localPath) {
        try {
            const encodedPath = encodeURIComponent(filePath);
            const response = await this.client.get(
                `/projects/${projectName}/files/${encodedPath}`,
                { responseType: 'stream' }
            );

            await fs.ensureDir(path.dirname(localPath));

            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error) {
            throw new Error(`Failed to download file ${filePath}: ${error.message}`);
        }
    }

    async deleteFile(projectName, filePath) {
        try {
            const encodedPath = encodeURIComponent(filePath);
            const response = await this.client.delete(`/projects/${projectName}/files/${encodedPath}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    async createSnapshot(projectName, description = '') {
        try {
            const response = await this.client.post(`/projects/${projectName}/snapshot`, { description });
            return response.data.snapshot;
        } catch (error) {
            throw new Error(`Failed to create snapshot: ${error.message}`);
        }
    }

    async getSnapshots(projectName) {
        try {
            const response = await this.client.get(`/projects/${projectName}/snapshots`);
            return response.data.snapshots || [];
        } catch (error) {
            throw new Error(`Failed to get snapshots: ${error.message}`);
        }
    }

    async restoreSnapshot(projectName, snapshotId, backup = true) {
        try {
            const response = await this.client.post(
                `/projects/${projectName}/restore/${snapshotId}`,
                { backup }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Failed to restore snapshot: ${error.message}`);
        }
    }

    async testConnection() {
        try {
            await this.client.get('/projects');
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = ApiClient;