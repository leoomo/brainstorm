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

// ========== 新 UI 组件 (v2.0) ==========

/**
 * 活跃讨论卡片组件
 * 显示讨论进度、模型状态、操作按钮
 */
class DiscussionCard extends HTMLElement {
  constructor() {
    super();
    this.discussion = null;
  }

  static get observedAttributes() {
    return ['discussion-id'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'discussion-id' && oldValue !== newValue) {
      this.loadDiscussion(newValue);
    }
  }

  loadDiscussion(discussionId) {
    if (window.StateManager) {
      this.discussion = StateManager.state.discussions.find(d => d.id === discussionId);
      this.render();
    }
  }

  setDiscussion(discussion) {
    this.discussion = discussion;
    this.render();
  }

  render() {
    if (!this.discussion) {
      this.innerHTML = '<div class="discussion-card-placeholder">加载中...</div>';
      return;
    }

    const { id, title, status, progress, models = [], currentRound = 1, totalRounds = 3 } = this.discussion;

    const isRunning = status === 'running';
    const isPaused = status === 'paused';
    const isCompleted = status === 'completed';
    const isError = status === 'error';

    // 状态图标
    const statusIcon = this.getStatusIcon(status);

    // 模型状态网格
    const modelGrid = models.map(m => this.renderModelStatus(m)).join('');

    // 操作按钮
    const actions = this.renderActions(status, id);

    this.innerHTML = `
      <div class="discussion-card ${status}" data-id="${id}">
        <div class="discussion-card-header">
          <div class="discussion-title">
            ${statusIcon}
            <span class="title-text">${Utils.escapeHtml(title)}</span>
          </div>
          <span class="discussion-time">${this.formatTime(this.discussion.updatedAt)}</span>
        </div>

        <div class="discussion-progress">
          <div class="progress-bar-container">
            <div class="progress-bar ${isRunning ? 'animated' : ''}" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${progress}%</span>
        </div>

        <div class="discussion-meta">
          <span class="round-info">第 ${currentRound}/${totalRounds} 轮</span>
          ${isRunning ? '<span class="pulse-indicator">进行中</span>' : ''}
        </div>

        <div class="model-grid">
          ${modelGrid}
        </div>

        <div class="discussion-actions">
          ${actions}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  getStatusIcon(status) {
    const icons = {
      running: '<span class="status-icon running">●</span>',
      paused: '<span class="status-icon paused">⏸</span>',
      completed: '<span class="status-icon completed">✓</span>',
      error: '<span class="status-icon error">!</span>',
      cancelled: '<span class="status-icon cancelled">✕</span>'
    };
    return icons[status] || icons.running;
  }

  renderModelStatus(model) {
    if (!model) return '';

    const statusIcons = {
      pending: '<span class="model-status-dot pending">○</span>',
      running: '<span class="model-status-dot running pulse">●</span>',
      completed: '<span class="model-status-dot completed">●</span>',
      error: '<span class="model-status-dot error">●</span>'
    };

    return `
      <div class="model-status-item" data-model-id="${model.modelId || 'unknown'}">
        <div class="model-status-header">
          ${statusIcons[model.status] || statusIcons.pending}
          <span class="model-name">${Utils.escapeHtml(model.name || 'Unknown')}</span>
        </div>
        <div class="model-progress-bar">
          <div class="model-progress-fill" style="width: ${model.progress || 0}%"></div>
        </div>
      </div>
    `;
  }

  renderActions(status, id) {
    if (status === 'running') {
      return `
        <button class="btn btn-secondary btn-sm" data-action="pause" data-id="${id}">暂停</button>
        <button class="btn btn-danger btn-sm" data-action="cancel" data-id="${id}">取消</button>
        <button class="btn btn-primary btn-sm" data-action="view" data-id="${id}">查看</button>
      `;
    }

    if (status === 'paused') {
      return `
        <button class="btn btn-primary btn-sm" data-action="resume" data-id="${id}">继续</button>
        <button class="btn btn-danger btn-sm" data-action="cancel" data-id="${id}">取消</button>
      `;
    }

    if (status === 'completed') {
      return `
        <button class="btn btn-secondary btn-sm" data-action="view" data-id="${id}">查看对话</button>
        <button class="btn btn-primary btn-sm" data-action="export" data-id="${id}">生成文档</button>
        <button class="btn btn-secondary btn-sm" data-action="restart" data-id="${id}">重新讨论</button>
      `;
    }

    if (status === 'error') {
      return `
        <button class="btn btn-primary btn-sm" data-action="retry" data-id="${id}">重试</button>
        <button class="btn btn-secondary btn-sm" data-action="view" data-id="${id}">查看</button>
      `;
    }

    return '';
  }

  bindEvents() {
    this.querySelectorAll('.discussion-actions button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        this.dispatchEvent(new CustomEvent('discussion-action', {
          bubbles: true,
          detail: { action, discussionId: id }
        }));
      });
    });

    this.addEventListener('click', (e) => {
      if (!e.target.closest('.discussion-actions')) {
        this.dispatchEvent(new CustomEvent('discussion-select', {
          bubbles: true,
          detail: { discussionId: this.discussion.id }
        }));
      }
    });
  }

  formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    return date.toLocaleDateString('zh-CN');
  }
}

customElements.define('discussion-card', DiscussionCard);

/**
 * 底部控制面板组件
 */
class BottomPanel extends HTMLElement {
  constructor() {
    super();
    this.state = 'collapsed';
  }

  connectedCallback() {
    this.render();
  }

  setState(state) {
    this.state = state;
    this.setAttribute('data-state', state);
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="bottom-panel" data-state="${this.state}">
        <div class="panel-header">
          <div class="panel-drag-handle"></div>
          <div class="panel-title">
            <span class="panel-status-indicator"></span>
            <span class="panel-title-text">讨论控制台</span>
          </div>
          <div class="panel-controls">
            <button class="panel-btn panel-toggle" data-action="toggle">
              ${this.state === 'collapsed' ? '▲' : '▼'}
            </button>
            <button class="panel-btn panel-fullscreen" data-action="fullscreen">
              ${this.state === 'fullscreen' ? '⊡' : '□'}
            </button>
          </div>
        </div>
        <div class="panel-content">
          <div class="panel-placeholder">
            选择或启动一个讨论以查看详情
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const toggleBtn = this.querySelector('[data-action="toggle"]');
    const fullscreenBtn = this.querySelector('[data-action="fullscreen"]');
    const header = this.querySelector('.panel-header');

    toggleBtn?.addEventListener('click', () => {
      const newState = this.state === 'collapsed' ? 'expanded' : 'collapsed';
      this.setState(newState);
      this.dispatchEvent(new CustomEvent('panel-state-change', {
        detail: { state: newState }
      }));
    });

    fullscreenBtn?.addEventListener('click', () => {
      const newState = this.state === 'fullscreen' ? 'expanded' : 'fullscreen';
      this.setState(newState);
      this.dispatchEvent(new CustomEvent('panel-state-change', {
        detail: { state: newState }
      }));
    });
  }

  setDiscussionContent(discussion) {
    const content = this.querySelector('.panel-content');
    if (!content || !discussion) return;

    const { models = [], messages = [], currentRound = 1, totalRounds = 3 } = discussion;

    const latestOutput = messages.length > 0 && messages[messages.length - 1].responses
      ? messages[messages.length - 1].responses.map(r =>
          `<div class="output-message">
            <div class="output-header">
              <span class="model-badge">${Utils.escapeHtml(r.model || 'Unknown')}</span>
            </div>
            <div class="output-content">${Utils.escapeHtml(r.content?.substring(0, 200) || '')}...</div>
          </div>`
        ).join('')
      : '<div class="output-placeholder">等待模型响应...</div>';

    content.innerHTML = `
      <div class="discussion-detail">
        <div class="detail-header">
          <h3 class="detail-title">${Utils.escapeHtml(discussion.title || '未命名讨论')}</h3>
          <span class="detail-round">第 ${currentRound}/${totalRounds} 轮</span>
        </div>

        <div class="detail-models">
          ${models.map(m => `
            <div class="detail-model-item ${m.status || 'pending'}">
              <span class="model-name">${Utils.escapeHtml(m.name || 'Unknown')}</span>
              <div class="model-progress">
                <div class="progress-fill" style="width: ${m.progress || 0}%"></div>
              </div>
              <span class="model-status-text">${this.getStatusText(m.status)}</span>
            </div>
          `).join('')}
        </div>

        <div class="detail-output">
          <div class="output-header">实时输出</div>
          <div class="output-stream">
            ${latestOutput}
          </div>
        </div>
      </div>
    `;

    const outputStream = content.querySelector('.output-stream');
    if (outputStream) {
      outputStream.scrollTop = outputStream.scrollHeight;
    }
  }

  getStatusText(status) {
    const texts = {
      pending: '等待中',
      running: '思考中...',
      completed: '已完成',
      error: '出错'
    };
    return texts[status] || status || '等待中';
  }
}

customElements.define('bottom-panel', BottomPanel);

// 导出新组件
window.DiscussionComponents = {
  DiscussionCard,
  BottomPanel
};

// ========== 新 UI 工具函数 ==========

/**
 * HTML 转义
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? '昨天' : `${days}天前`;
  }

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
