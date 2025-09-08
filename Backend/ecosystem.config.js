module.exports = {
  apps: [{
    name: 'noxtmstudio-backend',
    script: 'server.js',
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
      MONGODB_URI: 'mongodb+srv://noxtmstudio:qWWniMmKtOxnJcm9@cluster0.4jneyth.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
      JWT_SECRET: 'noxtmstudio-super-secure-jwt-secret-key-2024-production-very-long-and-random',
      BCRYPT_ROUNDS: 12
    }
  }]
};
