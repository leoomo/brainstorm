// AI 讨论助手 - 通用组件模块

const Components = {
  // 创建模型芯片 HTML
  createModelChip(config, isSelected = false) {
    const chip = document.createElement('div');
    chip.className = `model-chip${isSelected ? ' selected' : ''}`;
    chip.dataset.id = config.id;

    chip.innerHTML = `
      <span class="model-chip-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
      <span class="model-chip-name">${Utils.escapeHtml(config.name)}</span>
      <span class="model-chip-provider provider-${config.provider}">${config.provider.toUpperCase()}</span>
    `;

    return chip;
  },

  // 创建配置项 HTML
  createConfigItem(config) {
    const item = document.createElement('div');
    item.className = `config-item${config.validated ? '' : ' disabled'}`;
    item.dataset.id = config.id;

    item.innerHTML = `
      <div class="config-info">
        <div class="config-name">
          ${Utils.escapeHtml(config.name)}
          <span class="config-badge ${config.validated ? 'enabled' : 'disabled'}">${config.validated ? '可用' : '不可用'}</span>
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

  // 绑定模型芯片事件
  bindModelChipEvents(chip, config, onToggle) {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      const isSelected = chip.classList.contains('selected');
      onToggle(config.id, isSelected);
    });
  }
};

// 导出模块
window.Components = Components;
