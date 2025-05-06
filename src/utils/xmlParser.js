const xml2js = require('xml2js');
const cheerio = require('cheerio');

function parseXML(xmlString) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({
      explicitArray: false,
      normalize: true
    });
    
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        // 处理不同的RSS格式
        const channel = result.rss.channel;
        const items = channel.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : [];
        
        const parsedItems = items.map(item => {
          // 使用cheerio解析HTML内容，提取p标签
          let contentText = '';
          if (item['content:encoded'] || item.description) {
            const content = item['content:encoded'] || item.description;
            const $ = cheerio.load(content);
            // 提取所有p标签内容
            $('p').each((i, el) => {
              contentText += `<p>${$(el).html()}</p>`;
            });
            
            // 如果没有找到p标签，使用原始内容
            if (!contentText) {
              contentText = content;
            }
          }
          
          return {
            title: item.title || '无标题',
            link: item.link || '#',
            description: item.description || '',
            content: contentText || item.description || '',
            pubDate: item.pubDate || item.pubdate || new Date().toISOString()
          };
        });
        
        resolve(parsedItems);
      } catch (error) {
        reject(new Error(`解析XML失败: ${error.message}`));
      }
    });
  });
}

module.exports = parseXML;