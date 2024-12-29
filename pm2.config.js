module.exports = {
  apps: [{
    name: 'lottery',
    script: 'server.js',
    watch: true,
    ignore_watch: ['node_modules', 'data', 'logs'],
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
