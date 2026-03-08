// AI 讨论助手 - 通用组件模块

const Components = {
  // 创建模型项 HTML
  createModelItem(config, isSelected = false) {
    const label = document.createElement('label');
    label.className = `model-item${isSelected ? ' selected' : ''}`;
    label.dataset.id = config.id;

    label.innerHTML = `
      <input type="checkbox" value="${config.id}"${isSelected ? ' checked' : ''}>
      <span class="model-name">${Utils.escapeHtml(config.name)}</span>
      <span class="model-provider">${Utils.getProviderName(config.provider)}</span>
    `;

    return label;
  },

  // 创建配置项 HTML
  createConfigItem(config) {
    const item = document.createElement('div');
    item.className = `config-item${config.enabled ? '' : ' disabled'}`;
    item.dataset.id = config.id;

    item.innerHTML = `
      <div class="config-info">
        <div class="config-name">
          ${Utils.escapeHtml(config.name)}
          <span class="config-badge ${config.enabled ? 'enabled' : 'disabled'}">${config.enabled ? '已启用' : '已禁用'}</span>
        </div>
        <div class="config-provider">${Utils.getProviderName(config.provider)}</div>
      </div>
      <div class="config-actions">
        <button class="btn btn-secondary edit-config-btn">编辑</button>
        <button class="btn btn-danger delete-config-btn">删除</button>
      </div>
    `;

    return item;
  },

  // 创建历史项 HTML
  createHistoryItem(history) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.id = history.id;

    const modeNames = (history.modes || []).map(m => Utils.getModeName(m)).join(' / ');
    const modelNames = (history.models || []).join(', ');

    item.innerHTML = `
      <div class="history-title">${Utils.escapeHtml(history.title)}</div>
      <div class="history-meta">
        <span>${Utils.formatDate(history.createdAt)}</span>
        <span>${modeNames}</span>
        <span>${modelNames}</span>
      </div>
      <div class="history-actions">
        <button class="btn btn-secondary view-doc-btn">查看文档</button>
        <button class="btn btn-secondary delete-history-btn">删除</button>
      </div>
    `;

    return item;
  },

  // 创建消息项 HTML
  createMessage(msg) {
    const div = document.createElement('div');
    div.className = `message${msg.isHost ? ' host' : ''}`;

    div.innerHTML = `
      <div class="message-header">
        <span class="avatar">${msg.model.charAt(0).toUpperCase()}</span>
        <span>${Utils.escapeHtml(msg.model)}</span>
        ${msg.isHost ? '<span class="host-badge">主持人</span>' : ''}
        ${msg.isThinking ? '<span class="typing">思考中...</span>' : ''}
      </div>
      <div class="message-content ${msg.isThinking ? 'typing' : ''}">${Utils.escapeHtml(msg.content)}</div>
    `;

    return div;
  },

  // 创建单选卡片
  createRadioCard(value, label, description, isChecked = false) {
    const labelEl = document.createElement('label');
    labelEl.className = `radio-card${isChecked ? ' selected' : ''}`;

    labelEl.innerHTML = `
      <input type="checkbox" name="mode" value="${value}"${isChecked ? ' checked' : ''}>
      <span class="radio-label">${label}</span>
      <span class="radio-desc">${description}</span>
    `;

    return labelEl;
  },

  // 创建 Toast
  showToast(message, type = 'info', duration = 3000) {
    // 移除现有 toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  // 创建 Loading
  createLoading(text = '加载中...') {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = `
      <div class="spinner"></div>
      <span class="loading-text">${text}</span>
    `;
    return loading;
  },

  // 创建空状态
  createEmptyState(message, icon = '') {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = message;
    return empty;
  },

  // 绑定模型项事件
  bindModelItemEvents(item, onChange) {
    const checkbox = item.querySelector('input');

    item.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        checkbox.checked = !checkbox.checked;
      }
      if (checkbox.checked) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
      onChange();
    });

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
      onChange();
    });
  }
};

// 导出模块
window.Components = Components;
