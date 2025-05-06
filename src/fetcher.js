const axios = require('axios');
const parseXML = require('./utils/xmlParser');
const EventEmitter = require('events');

// 创建事件发射器来通知新数据
const dataEmitter = new EventEmitter();

async function fetchRSS(rssUrls) {
    const results = [];
    const errors = [];
    
    console.log('开始获取RSS源...');

    for (const url of rssUrls) {
        try {
            console.log(`正在获取: ${url}`);
            // 设置10秒超时
            const response = await axios.get(url, { timeout: 10000 });
            console.log(`成功获取: ${url}`);
            
            console.log('正在解析XML...');
            const parsedItems = await parseXML(response.data);
            console.log(`解析完成, 获取到${parsedItems.length}条项目`);
            
            // 将新数据添加到结果中并发出事件
            results.push(...parsedItems);
            
            // 发出新数据事件，附带当前的完整结果集
            dataEmitter.emit('newData', {
                items: [...results],
                source: url
            });
            
        } catch (error) {
            let errorMessage = '';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = `获取RSS源超时: ${url}`;
            } else if (error.response) {
                errorMessage = `获取RSS源失败: ${url}, 状态码: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = `获取RSS源失败: ${url}, 没有收到响应`;
            } else {
                errorMessage = `获取RSS源出错: ${url}: ${error.message}`;
            }
            
            console.error(errorMessage);
            errors.push({
                url: url,
                message: errorMessage
            });
            
            // 发出错误事件
            dataEmitter.emit('error', {
                url: url,
                message: errorMessage
            });
        }
    }

    console.log(`总共获取到${results.length}条RSS项目`);
    console.log(`有${errors.length}个RSS源获取失败`);
    
    // 返回结果和错误信息
    return {
        items: results,
        errors: errors
    };
}

module.exports = {
    fetchRSS,
    dataEmitter
};