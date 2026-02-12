module.exports = {
  apps: [{
    name: 'noxtm-backend',
    script: 'server.js',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 5000,
    listen_timeout: 3000,
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      // SECURITY: Credentials loaded from .env file (not version controlled)
      // MONGODB_URI and JWT_SECRET must be set in Backend/.env on production server
      BCRYPT_ROUNDS: 12
    }
  }]
};
