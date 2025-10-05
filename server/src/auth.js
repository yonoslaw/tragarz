const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthManager {
    constructor(password) {
        this.passwordHash = bcrypt.hashSync(password, 10);
        this.sessions = new Map();
        this.sessionTimeout = 24 * 60 * 60 * 1000;
    }

    async authenticate(req, res) {
        try {
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ error: 'Password required' });
            }

            const isValid = bcrypt.compareSync(password, this.passwordHash);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid password' });
            }

            const token = this.generateToken();
            const expiresAt = Date.now() + this.sessionTimeout;

            this.sessions.set(token, {
                createdAt: Date.now(),
                expiresAt: expiresAt,
                lastUsed: Date.now()
            });

            this.cleanupExpiredSessions();

            res.json({
                success: true,
                token: token,
                expiresAt: expiresAt
            });
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    }

    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    requireAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.startsWith('Bearer ')
                ? authHeader.substring(7)
                : req.headers['x-auth-token'];

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const session = this.sessions.get(token);
            if (!session) {
                return res.status(401).json({ error: 'Invalid token' });
            }

            if (Date.now() > session.expiresAt) {
                this.sessions.delete(token);
                return res.status(401).json({ error: 'Token expired' });
            }

            session.lastUsed = Date.now();
            req.auth = { token };
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ error: 'Authentication error' });
        }
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [token, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.sessions.delete(token);
            }
        }
    }

    revokeToken(token) {
        return this.sessions.delete(token);
    }

    getActiveSessions() {
        this.cleanupExpiredSessions();
        return this.sessions.size;
    }
}

module.exports = AuthManager;