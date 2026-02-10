// Root PM2 Ecosystem - Manages all Noxtm services
module.exports = {
  apps: [
    {
      name: 'noxtm-backend',
      cwd: './Backend',
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
        BCRYPT_ROUNDS: 12
      }
    },
    {
      name: 'noxtm-frontend',
      cwd: './Frontend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'noxtm-mail',
      cwd: './mail-frontend',
      script: 'serve -s build -l 3001',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ],

  // PM2 Deploy Configuration
  deploy: {
    production: {
      user: 'noxtm',
      host: 'noxtm.com',
      ref: 'origin/main',
      repo: 'git@github.com:YOUR_USERNAME/noxtm.git',
      path: '/home/noxtm/app',
      'pre-deploy-local': '',
      'post-deploy': 'bash deploy.sh',
      'pre-setup': ''
    }
  }
};
