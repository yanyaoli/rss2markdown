document.addEventListener('DOMContentLoaded', function() {
  // 检测是否在 Vercel 环境中
  const isVercel = window.location.hostname.includes('vercel.app');
  
  // 连接WebSocket（仅在非Vercel环境中）
  let socket;
  try {
    socket = isVercel ? null : io();
  } catch (e) {
    console.log('无法连接到Socket.IO，将使用轮询模式');
    socket = null;
  }
  
  const notification = document.getElementById('notification');
  const errorPanel = document.getElementById('errorPanel');
  const errorList = document.getElementById('errorList');
  const articlesContainer = document.getElementById('articlesContainer');
  const sortOrderSelect = document.getElementById('sortOrder');
  const dateRangeInput = document.getElementById('dateRange');
  const clearDateFilterBtn = document.getElementById('clearDateFilter');
  
  // 在 Vercel 环境下设置定期轮询
  if (isVercel) {
    // 每60秒轮询一次新数据
    setInterval(function() {
      fetch('/api/rss')
        .then(response => response.json())
        .then(data => {
          updateUIWithData(data);
        })
        .catch(error => {
          showNotification('获取数据失败: ' + error, true);
        });
    }, 60000);
  }
  
  // 更新UI的统一函数
  function updateUIWithData(data) {
    document.getElementById('fetchTime').textContent = data.fetchTime;
    document.getElementById('itemCount').textContent = data.items.length;
    
    if (data.errors && data.errors.length > 0) {
      document.querySelector('.error-count').style.display = 'block';
      document.getElementById('errorCount').textContent = data.errors.length;
      updateErrorList(data.errors);
    } else {
      document.querySelector('.error-count').style.display = 'none';
    }
    
    renderArticles(data.items);
    showNotification('数据已更新');
  }
  
  // 初始化日期选择器
  try {
    const picker = flatpickr(dateRangeInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      locale: "zh",
      onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
          filterArticlesByDate(selectedDates[0], selectedDates[1]);
        }
      }
    });
    
    // 清除日期筛选
    clearDateFilterBtn.addEventListener('click', function() {
      picker.clear();
      showAllArticles();
    });
  } catch (e) {
    console.error('无法初始化日期选择器:', e);
  }
  
  // 排序变化事件
  sortOrderSelect.addEventListener('change', function() {
    sortArticles(this.value);
  });
  
  // 显示通知
  function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.className = isError 
      ? 'notification error-notification show' 
      : 'notification show';
    
    setTimeout(() => {
      notification.className = 'notification';
    }, 3000);
  }
  
  // 根据日期筛选文章
  function filterArticlesByDate(startDate, endDate) {
    startDate.setHours(0, 0, 0, 0);
    // 设置结束日期为当天的最后一毫秒
    endDate = new Date(endDate);
    endDate.setHours(23, 59, 59, 999);
    
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    const articles = document.querySelectorAll('.article');
    let visibleCount = 0;
    
    articles.forEach(article => {
      const articleDate = parseInt(article.getAttribute('data-date'));
      if (articleDate >= startTime && articleDate <= endTime) {
        article.classList.remove('hidden');
        visibleCount++;
      } else {
        article.classList.add('hidden');
      }
    });
    
    showNotification(`显示 ${visibleCount} 条符合日期范围的内容`);
  }
  
  // 显示所有文章
  function showAllArticles() {
    const articles = document.querySelectorAll('.article');
    articles.forEach(article => {
      article.classList.remove('hidden');
    });
  }
  
  // 排序文章
  function sortArticles(order) {
    const articles = Array.from(document.querySelectorAll('.article'));
    
    articles.sort((a, b) => {
      const dateA = parseInt(a.getAttribute('data-date'));
      const dateB = parseInt(b.getAttribute('data-date'));
      
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    // 重新排列DOM
    const container = document.getElementById('articlesContainer');
    container.innerHTML = '';
    articles.forEach(article => {
      container.appendChild(article);
    });
    
    showNotification(`内容已按${order === 'asc' ? '从早到晚' : '从晚到早'}排序`);
  }
  
  // 添加文章到容器
  function renderArticles(items) {
    articlesContainer.innerHTML = '';
    
    items.forEach((item, index) => {
      const articleDiv = document.createElement('div');
      articleDiv.className = 'article';
      articleDiv.dataset.index = index;
      articleDiv.dataset.date = new Date(item.pubDate).getTime();
      
      articleDiv.innerHTML = `
        <div class="article-header">
          <span class="date">${item.formattedDate}</span>
          <button class="copy-btn" data-index="${index}">复制</button>
        </div>
        <div class="article-content">
          <h2>${item.title}</h2>
          <div class="content">${item.content}</div>
          <div class="link">
            <a href="${item.link}" target="_blank">${item.link}</a>
          </div>
        </div>
        <div class="markdown-preview" id="preview-${index}">
          <pre>## ${item.title}
${item.content.replace(/<\/?[^>]+(>|$)/g, "")}
> ${item.link}</pre>
        </div>
      `;
      
      articlesContainer.appendChild(articleDiv);
    });
    
    // 应用当前排序方式
    sortArticles(sortOrderSelect.value);
    
    // 重新绑定复制按钮事件
    attachCopyButtonEvents();
  }
  
  // 更新错误列表
  function updateErrorList(errors) {
    errorList.innerHTML = '';
    
    errors.forEach(error => {
      const li = document.createElement('li');
      li.textContent = error.message;
      errorList.appendChild(li);
    });
  }
  
  // WebSocket事件监听（仅在非Vercel环境中）
  if (socket) {
    socket.on('dataUpdated', function(data) {
      updateUIWithData(data);
    });
    
    socket.on('sourceUpdated', function(data) {
      document.getElementById('fetchTime').textContent = data.fetchTime;
      document.getElementById('itemCount').textContent = data.items.length;
      
      renderArticles(data.items);
      showNotification(`已更新 ${data.source} 的数据`);
    });
    
    socket.on('sourceError', function(error) {
      const errorCount = parseInt(document.getElementById('errorCount').textContent) || 0;
      document.getElementById('errorCount').textContent = errorCount + 1;
      
      const li = document.createElement('li');
      li.textContent = error.message;
      errorList.appendChild(li);
      
      showNotification(`获取失败: ${error.url}`, true);
    });
    
    socket.on('fetchError', function(data) {
      showNotification(data.message, true);
    });
  }
  
  // 复制单个文章功能
  function attachCopyButtonEvents() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
      button.addEventListener('click', function() {
        const index = this.getAttribute('data-index');
        const previewElement = document.getElementById(`preview-${index}`);
        const textToCopy = previewElement.querySelector('pre').textContent;
        
        copyToClipboard(textToCopy, this);
      });
    });
  }

  // 初始绑定复制按钮事件
  attachCopyButtonEvents();

  // 复制全部功能
  const copyAllButton = document.getElementById('copyAll');
  copyAllButton.addEventListener('click', function() {
    const allPreviews = document.querySelectorAll('.article:not(.hidden) .markdown-preview pre');
    let allText = '';
    
    allPreviews.forEach(preview => {
      allText += preview.textContent + '\n\n';
    });
    
    copyToClipboard(allText, this);
  });

  // 刷新数据功能
  const refreshButton = document.getElementById('refreshData');
  refreshButton.addEventListener('click', function() {
    fetch('/api/refresh')
      .then(response => response.json())
      .then(data => {
        showNotification(data.message);
        
        // 在Vercel环境下，直接获取最新数据
        if (isVercel) {
          setTimeout(() => {
            fetch('/api/rss')
              .then(response => response.json())
              .then(updateUIWithData)
              .catch(error => {
                showNotification('获取数据失败: ' + error, true);
              });
          }, 1000);
        }
      })
      .catch(error => {
        showNotification('刷新数据失败: ' + error, true);
      });
  });
  
  // 显示/隐藏错误面板
  const toggleErrorsButton = document.getElementById('toggleErrors');
  toggleErrorsButton.addEventListener('click', function() {
    if (errorPanel.style.display === 'none') {
      errorPanel.style.display = 'block';
      this.textContent = '隐藏错误信息';
    } else {
      errorPanel.style.display = 'none';
      this.textContent = '显示错误信息';
    }
  });

  // 复制到剪贴板的辅助函数
  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = '已复制!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('无法复制文本: ', err);
      alert('复制失败，请手动复制');
    });
  }
  
  // 初始化排序
  sortArticles(sortOrderSelect.value);
});