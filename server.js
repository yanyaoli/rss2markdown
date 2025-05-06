const path = require('path');
const pm2 = require('pm2');

// 配置PM2进程
const processConfig = {
  name: 'rss-to-markdown',
  script: path.join(__dirname, 'src/index.js'),
  watch: false,
  instances: 1,
  autorestart: true,
  max_memory_restart: '200M',
  env: {
    NODE_ENV: 'production',
    PORT: 3000
  }
};

// 使用PM2启动应用
pm2.connect(function(err) {
  if (err) {
    console.error('无法连接到PM2:', err);
    process.exit(2);
  }
  
  pm2.start(processConfig, function(err, apps) {
    if (err) {
      console.error('启动应用失败:', err);
      pm2.disconnect();
      return;
    }
    
    console.log('应用已通过PM2启动');
    pm2.disconnect();
  });
});