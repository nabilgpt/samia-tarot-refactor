module.exports = {
  apps: [
    {
      name: 'samia-backend',
      script: './src/api/index.js',
      node_args: '-r dotenv/config',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      // Auto-restart settings
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 1000,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Memory management
      max_memory_restart: '500M',
      
      // Health monitoring
      watch: false, // Set to true for development if you want auto-restart on file changes
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Process management
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Performance
      instance_var: 'INSTANCE_ID',
      
      // Advanced settings
      autorestart: true,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
      
      // Windows-specific settings
      windowsHide: true
    }
  ]
}; 