document.addEventListener('DOMContentLoaded', function() {
  // DOM 元素缓存
  const elements = {
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText'),
    errorPanel: document.getElementById('errorPanel'),
    errorList: document.getElementById('errorList'),
    articlesContainer: document.getElementById('articlesContainer'),
    sortOrderSelect: document.getElementById('sortOrder'),
    dateRangeInput: document.getElementById('dateRange'),
    clearDateFilterBtn: document.getElementById('clearDateFilter'),
    refreshButton: document.getElementById('refreshData'),
    copyAllButton: document.getElementById('copyAll'),
    toggleErrorsButton: document.getElementById('toggleErrors'),
    toggleSettingsButton: document.getElementById('toggleSettings'),
    settingsPanel: document.getElementById('settingsPanel'),
    resetRssLinksButton: document.getElementById('resetRssLinks'),
    rssForm: document.getElementById('rssForm'),
    countdownElement: document.getElementById('countdown')
  };
  
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
  
  // 倒计时功能
  let countdown = 60;
  const countdownInterval = setInterval(function() {
    countdown--;
    if (elements.countdownElement) {
      elements.countdownElement.textContent = countdown;
    }
    
    if (countdown <= 0) {
      countdown = 60;
      refreshData();
    }
  }, 1000);
  
  // 设置自动刷新 - 每分钟刷新一次
  function refreshData() {
    showNotification('正在刷新数据...', false, 'bi-arrow-repeat');
    fetch('/api/refresh')
      .then(response => response.json())
      .then(data => {
        // 请求最新数据并更新UI
        setTimeout(() => {
          fetch('/api/rss')
            .then(response => response.json())
            .then(updateUIWithData)
            .catch(error => {
              showNotification('获取数据失败: ' + error, true, 'bi-exclamation-triangle');
            });
        }, 1000);
      })
      .catch(error => {
        showNotification('刷新数据失败: ' + error, true, 'bi-exclamation-triangle');
      });
  }
  
  // 更新UI的统一函数
  function updateUIWithData(data) {
    safeUpdateElement('fetchTime', data.fetchTime);
    safeUpdateElement('itemCount', data.items.length);
    
    const errorCountElement = document.querySelector('.error-count');
    if (data.errors && data.errors.length > 0) {
      if (errorCountElement) errorCountElement.style.display = 'flex';
      safeUpdateElement('errorCount', data.errors.length);
      updateErrorList(data.errors);
    } else {
      if (errorCountElement) errorCountElement.style.display = 'none';
    }
    
    renderArticles(data.items);
    showNotification('数据已更新', false, 'bi-check-circle');
  }
  
  // 安全地更新元素
  function safeUpdateElement(id, content) {
    const element = document.getElementById(id);
    if (element) element.textContent = content;
  }
  
  // 初始化日期选择器
  try {
    const picker = flatpickr(elements.dateRangeInput, {
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
    if (elements.clearDateFilterBtn) {
      elements.clearDateFilterBtn.addEventListener('click', function() {
        picker.clear();
        showAllArticles();
      });
    }
  } catch (e) {
    console.error('无法初始化日期选择器:', e);
  }
  
  // 排序变化事件
  if (elements.sortOrderSelect) {
    elements.sortOrderSelect.addEventListener('change', function() {
      sortArticles(this.value);
    });
  }
  
  // 显示通知
  function showNotification(message, isError = false, icon = 'bi-info-circle') {
    if (!elements.notification || !elements.notificationText) return;
    
    elements.notificationText.textContent = message;
    elements.notification.className = isError 
      ? 'notification error-notification show' 
      : 'notification show';
    
    // 更新图标
    const iconElement = elements.notification.querySelector('i');
    if (iconElement) {
      iconElement.className = `bi ${icon}`;
    }
    
    setTimeout(() => {
      elements.notification.className = 'notification';
    }, 3000);
  }
  
  // 根据日期筛选文章
  function filterArticlesByDate(startDate, endDate) {
    startDate.setHours(0, 0, 0, 0);
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
    
    showNotification(`显示 ${visibleCount} 条符合日期范围的内容`, false, 'bi-calendar-check');
  }
  
  // 显示所有文章
  function showAllArticles() {
    const articles = document.querySelectorAll('.article');
    articles.forEach(article => {
      article.classList.remove('hidden');
    });
    
    showNotification('显示全部内容', false, 'bi-eye');
  }
  
  // 排序文章
  function sortArticles(order) {
    if (!elements.articlesContainer) return;
    
    const articles = Array.from(document.querySelectorAll('.article'));
    
    articles.sort((a, b) => {
      const dateA = parseInt(a.getAttribute('data-date'));
      const dateB = parseInt(b.getAttribute('data-date'));
      
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    // 重新排列DOM
    elements.articlesContainer.innerHTML = '';
    articles.forEach(article => {
      elements.articlesContainer.appendChild(article);
    });
    
    showNotification(`内容已按${order === 'asc' ? '从早到晚' : '从晚到早'}排序`, false, 'bi-sort-down');
  }
  
  // 添加文章到容器
  function renderArticles(items) {
    if (!elements.articlesContainer) return;
    
    elements.articlesContainer.innerHTML = '';
    
    items.forEach((item, index) => {
      const articleDiv = document.createElement('div');
      articleDiv.className = 'article';
      articleDiv.dataset.index = index;
      articleDiv.dataset.date = new Date(item.pubDate).getTime();
      
      articleDiv.innerHTML = `
        <div class="article-header">
          <span class="date"><i class="bi bi-calendar-event"></i> ${item.formattedDate}</span>
          <button class="copy-btn" data-index="${index}"><i class="bi bi-clipboard"></i> 复制</button>
        </div>
        <div class="article-content">
          <h2>${item.title}</h2>
          <div class="content">${item.content}</div>
          <div class="link">
            <a href="${item.link}" target="_blank"><i class="bi bi-box-arrow-up-right"></i> ${item.link}</a>
          </div>
        </div>
        <div class="markdown-preview" id="preview-${index}">
          <pre>## ${item.title}
${item.content.replace(/<\/?[^>]+(>|$)/g, "")}
> 原文链接：${item.link}</pre>
        </div>
      `;
      
      elements.articlesContainer.appendChild(articleDiv);
    });
    
    // 应用当前排序方式
    if (elements.sortOrderSelect) {
      sortArticles(elements.sortOrderSelect.value);
    }
    
    // 重新绑定复制按钮事件
    attachCopyButtonEvents();
  }
  
  // 更新错误列表
  function updateErrorList(errors) {
    if (!elements.errorList) return;
    
    elements.errorList.innerHTML = '';
    
    errors.forEach(error => {
      const li = document.createElement('li');
      li.textContent = error.message;
      elements.errorList.appendChild(li);
    });
  }
  
  // WebSocket事件监听
  if (socket) {
    socket.on('dataUpdated', updateUIWithData);
    
    socket.on('sourceUpdated', function(data) {
      safeUpdateElement('fetchTime', data.fetchTime);
      safeUpdateElement('itemCount', data.items.length);
      
      renderArticles(data.items);
      showNotification(`已更新 ${data.source} 的数据`, false, 'bi-check-circle');
    });
    
    socket.on('sourceError', function(error) {
      const errorCountElement = document.getElementById('errorCount');
      if (errorCountElement) {
        const errorCount = parseInt(errorCountElement.textContent) || 0;
        errorCountElement.textContent = errorCount + 1;
      }
      
      if (elements.errorList) {
        const li = document.createElement('li');
        li.textContent = error.message;
        elements.errorList.appendChild(li);
      }
      
      showNotification(`获取失败: ${error.url}`, true, 'bi-exclamation-triangle');
    });
    
    socket.on('fetchError', function(data) {
      showNotification(data.message, true, 'bi-exclamation-triangle');
    });
  }
  
  // 复制单个文章功能
  function attachCopyButtonEvents() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
      button.addEventListener('click', function() {
        const index = this.getAttribute('data-index');
        const previewElement = document.getElementById(`preview-${index}`);
        if (previewElement) {
          const textToCopy = previewElement.querySelector('pre').textContent;
          copyToClipboard(textToCopy, this);
        }
      });
    });
  }

  // 初始绑定复制按钮事件
  attachCopyButtonEvents();

  // 复制全部功能
  if (elements.copyAllButton) {
    elements.copyAllButton.addEventListener('click', function() {
      const allPreviews = document.querySelectorAll('.article:not(.hidden) .markdown-preview pre');
      let allText = '';
      
      allPreviews.forEach(preview => {
        allText += preview.textContent + '\n\n';
      });
      
      copyToClipboard(allText, this);
    });
  }

  // 刷新数据功能
  if (elements.refreshButton) {
    elements.refreshButton.addEventListener('click', function() {
      countdown = 60; // 重置倒计时
      if (elements.countdownElement) {
        elements.countdownElement.textContent = countdown;
      }
      refreshData();
    });
  }
  
  // 显示/隐藏错误面板
  if (elements.toggleErrorsButton && elements.errorPanel) {
    elements.toggleErrorsButton.addEventListener('click', function() {
      if (elements.errorPanel.style.display === 'none') {
        elements.errorPanel.style.display = 'block';
        this.innerHTML = '<i class="bi bi-eye-slash"></i> 隐藏错误信息';
      } else {
        elements.errorPanel.style.display = 'none';
        this.innerHTML = '<i class="bi bi-exclamation-circle"></i> 显示错误信息';
      }
    });
  }

  // 复制到剪贴板的辅助函数
  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="bi bi-check-lg"></i> 已复制!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('无法复制文本: ', err);
      showNotification('复制失败，请手动复制', true, 'bi-clipboard-x');
    });
  }
  
  // 处理设置面板显示/隐藏
  if (elements.toggleSettingsButton && elements.settingsPanel) {
    elements.toggleSettingsButton.addEventListener('click', function() {
      if (elements.settingsPanel.style.display === 'none') {
        elements.settingsPanel.style.display = 'block';
        this.innerHTML = '<i class="bi bi-x-lg"></i> 隐藏设置';
      } else {
        elements.settingsPanel.style.display = 'none';
        this.innerHTML = '<i class="bi bi-gear"></i> RSS设置';
      }
    });
  }
  
  // 处理恢复默认RSS链接
  if (elements.resetRssLinksButton) {
    elements.resetRssLinksButton.addEventListener('click', function() {
      fetch('/api/rss-links')
        .then(response => response.json())
        .then(data => {
          // 修改此处，优先使用 defaultRssLinks
          const defaultLinks = data.defaultRssLinks || [];
          const rssLinksTextarea = document.getElementById('rssLinks');
          if (rssLinksTextarea) {
            rssLinksTextarea.value = defaultLinks.join('\n');
          }
          showNotification('已恢复默认RSS链接', false, 'bi-arrow-counterclockwise');
        })
        .catch(error => {
          showNotification('获取默认RSS链接失败: ' + error, true, 'bi-exclamation-triangle');
        });
    });
  }
  
  // 处理RSS链接表单提交
  if (elements.rssForm) {
    elements.rssForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const rssLinksTextarea = document.getElementById('rssLinks');
      if (!rssLinksTextarea) return;
      
      const rssLinks = rssLinksTextarea.value
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);
      
      if (rssLinks.length === 0) {
        showNotification('请输入至少一个RSS链接', true, 'bi-exclamation-triangle');
        return;
      }
      
      fetch('/api/update-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rssLinks })
      })
      .then(response => response.json())
      .then(data => {
        showNotification(data.message, false, 'bi-check-circle');
        // 更新后刷新数据
        setTimeout(() => {
          countdown = 60; // 重置倒计时
          if (elements.countdownElement) {
            elements.countdownElement.textContent = countdown;
          }
          refreshData();
        }, 500);
      })
      .catch(error => {
        showNotification('更新RSS链接失败: ' + error, true, 'bi-exclamation-triangle');
      });
    });
  }
  
  // 初始化排序
  if (elements.sortOrderSelect) {
    sortArticles(elements.sortOrderSelect.value);
  }
});