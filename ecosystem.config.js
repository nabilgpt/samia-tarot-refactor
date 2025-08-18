module.exports = {
  apps: [
    {
      name: 'samia-tarot-backend',
      script: 'src/api/index.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      ignore_watch: [
        'node_modules',
        'uploads',
        'logs',
        'temp-audio',
        '*.md',
        'frontend'
      ],
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: true,
      shutdown_with_message: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z'
    }
  ]
}; 