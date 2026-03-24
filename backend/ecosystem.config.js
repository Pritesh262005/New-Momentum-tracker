module.exports = {
  apps: [{
    name: 'almts-backend',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/almts/backend-error.log',
    out_file: '/var/log/almts/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
