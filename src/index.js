const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { fetchRSS, dataEmitter } = require('./fetcher');
const config = require('./config/default');
const { formatDate } = require('./utils/dateHelper');
const fs = require('fs');

// 创建 Express 应用
const app = express();

// 启用JSON解析中间件
app.use(express.json());

// 检测环境类型
const isVercel = process.env.VERCEL === '1';

// 创建用户自定义RSS链接的存储
let customRssLinks = [];
// 尝试从本地存储读取自定义RSS链接
try {
  if (fs.existsSync('./custom-rss.json')) {
    const data = fs.readFileSync('./custom-rss.json', 'utf8');
    customRssLinks = JSON.parse(data);
    console.log('已加载自定义RSS链接:', customRssLinks);
  }
} catch (error) {
  console.error('读取自定义RSS链接失败:', error);
}

// 保存自定义RSS链接到本地存储
function saveCustomRssLinks() {
  if (!isVercel) { // 在Vercel环境中不保存到本地文件
    try {
      fs.writeFileSync('./custom-rss.json', JSON.stringify(customRssLinks), 'utf8');
      console.log('自定义RSS链接已保存');
    } catch (error) {
      console.error('保存自定义RSS链接失败:', error);
    }
  }
}

// 获取当前使用的RSS链接
function getCurrentRssLinks() {
  return customRssLinks.length > 0 ? customRssLinks : config.rssLinks;
}

// 创建 HTTP 服务器和 Socket.IO 实例 
let server, io;
if (!isVercel) {
  // 传统部署：创建 HTTP 服务器和长期运行的 WebSocket
  server = http.createServer(app);
  io = socketIO(server);
  
  // 设置WebSocket连接
  io.on('connection', (socket) => {
    console.log('新客户端连接');
    
    // 发送当前数据给新连接的客户端
    socket.emit('dataUpdated', latestData);
    
    // 监听断开连接事件
    socket.on('disconnect', () => {
      console.log('客户端断开连接');
    });
  });
  
  // 监听数据发射器的事件
  dataEmitter.on('newData', (data) => {
    // 按日期排序
    data.items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 格式化日期
    const formattedItems = data.items.map(item => ({
      ...item,
      formattedDate: formatDate(item.pubDate)
    }));
    
    // 更新实时数据
    latestData.items = formattedItems;
    latestData.fetchTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    latestData.rssLinks = getCurrentRssLinks();

    // 通知所有连接的客户端有新的源数据
    io.emit('sourceUpdated', {
      items: formattedItems,
      source: data.source,
      fetchTime: latestData.fetchTime,
      rssLinks: getCurrentRssLinks()
    });
  });
  
  dataEmitter.on('error', (error) => {
    // 添加错误到错误列表
    latestData.errors.push(error);
    
    // 通知所有连接的客户端有错误发生
    io.emit('sourceError', error);
  });
}

const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, '../public')));

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 存储最新的数据
let latestData = {
  items: [],
  errors: [],
  fetchTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
  rssLinks: getCurrentRssLinks()
};

// 定义获取数据的函数
async function fetchData() {
  try {
    console.log('开始获取RSS数据...');
    const result = await fetchRSS(getCurrentRssLinks()); // 使用当前RSS链接
    
    // 按日期排序
    result.items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 格式化日期
    const formattedData = result.items.map(item => ({
      ...item,
      formattedDate: formatDate(item.pubDate)
    }));
    
    // 更新最新数据
    latestData = {
      items: formattedData,
      errors: result.errors,
      fetchTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      timeZone: 'Asia/Shanghai',
      rssLinks: getCurrentRssLinks()
    };
    
    // 如果不是 Vercel 环境，通知所有连接的客户端数据已更新
    if (!isVercel && io) {
      io.emit('dataUpdated', latestData);
    }
    
    console.log('RSS数据获取完成，共获取到', formattedData.length, '条项目');
    return latestData;
  } catch (error) {
    console.error('获取RSS数据时发生错误:', error);
    if (!isVercel && io) {
      io.emit('fetchError', { message: '获取RSS数据失败: ' + error.message });
    }
    throw error;
  }
}

// 主页路由
app.get('/', async (req, res) => {
  try {
    // 在 Vercel 环境中，每次请求都获取新数据
    // 在传统环境中，仅在没有数据时获取
    if (isVercel || latestData.items.length === 0) {
      await fetchData();
    }
    
    res.render('index', latestData);
  } catch (error) {
    console.error('渲染页面失败:', error);
    res.status(500).render('error', { error: '获取或渲染数据失败' });
  }
});

// API端点 - 获取原始数据
app.get('/api/rss', async (req, res) => {
  try {
    if (isVercel) {
      // 在 Vercel 中每次请求都获取新数据
      await fetchData();
    }
    res.json(latestData);
  } catch (error) {
    res.status(500).json({ error: '获取RSS数据失败' });
  }
});

// 手动刷新数据
app.get('/api/refresh', async (req, res) => {
  try {
    if (isVercel) {
      // 在 Vercel 中同步获取
      await fetchData();
    } else {
      // 在传统环境中异步获取
      fetchData();
    }
    res.json({ message: '数据刷新已开始' });
  } catch (error) {
    res.status(500).json({ error: '触发数据刷新失败' });
  }
});

// 更新RSS链接列表
app.post('/api/update-rss', (req, res) => {
  try {
    const { rssLinks } = req.body;
    
    if (!Array.isArray(rssLinks) || rssLinks.length === 0) {
      return res.status(400).json({ error: '请提供有效的RSS链接列表' });
    }
    
    // 更新自定义RSS链接
    customRssLinks = rssLinks;
    
    // 保存到本地存储
    saveCustomRssLinks();
    
    // 返回成功消息
    res.json({ 
      message: 'RSS链接已更新',
      rssLinks: customRssLinks
    });
  } catch (error) {
    console.error('更新RSS链接失败:', error);
    res.status(500).json({ error: '更新RSS链接失败: ' + error.message });
  }
});

// 获取当前RSS链接列表
app.get('/api/rss-links', (req, res) => {
  // 修改此处，返回当前链接和默认链接
  res.json({ 
    rssLinks: getCurrentRssLinks(),
    defaultRssLinks: config.rssLinks
  });
});

// 修改 Socket.IO 客户端脚本
app.get('/socket.io/socket.io.js', (req, res) => {
  if (isVercel) {
    // 在 Vercel 环境中，提供一个模拟的 Socket.IO 客户端
    res.type('text/javascript').send(`
      // Vercel环境中的模拟Socket.IO客户端
      const io = {
        connect: function() {
          return {
            on: function() {},
            emit: function() {}
          };
        }
      };
      function io() {
        return {
          on: function() {},
          emit: function() {}
        };
      }
    `);
  } else {
    // 在传统环境中，返回401，让浏览器自己去请求真正的Socket.IO客户端
    res.status(401).end();
  }
});

// 处理 Vercel 环境中的导出
if (isVercel) {
  // 对于 Vercel，导出 Express 应用
  module.exports = app;
} else {
  // 传统环境：启动服务器
  server.listen(PORT, () => {
    console.log(`服务器已启动，访问 http://localhost:${PORT}`);
    // 初始获取数据
    fetchData();
  });

  // 处理程序退出
  process.on('SIGINT', () => {
    console.log('程序正在退出...');
    server.close(() => {
      console.log('HTTP服务器已关闭');
      process.exit(0);
    });
  });
}