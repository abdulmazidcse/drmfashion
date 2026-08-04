module.exports = {
  apps: [
    {
      name: 'fashion-store-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      // Runs in cluster mode to utilize all CPU cores
      instances: 'max', 
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
