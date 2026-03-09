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

    const { id, title, status, progress, models = [], currentRound = 1, modes = [] } = this.discussion;
    const totalRounds = this.discussion.totalRounds || modes.length || 1;

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
    this.currentDiscussion = null; // 缓存当前讨论数据
    // 立即设置初始状态，确保在 render 之前
    this.setAttribute('data-state', 'collapsed');
  }

  connectedCallback() {
    // 确保初始状态正确设置
    if (!this.hasAttribute('data-state')) {
      this.setAttribute('data-state', 'collapsed');
    }
    this.render();
  }

  setState(state) {
    this.state = state;
    this.setAttribute('data-state', state);
    this.render();
    // render 后恢复讨论内容
    if (this.currentDiscussion) {
      this.setDiscussionContent(this.currentDiscussion);
    }
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

  // ========== Timeline Methods (v2.0) ==========

  /**
   * 将讨论数据转换为时间线事件 (v2.1 - 支持完整流程显示)
   */
  generateTimelineEvents(discussion) {
    const events = [];
    const { models = [], messages = [], currentRound = 1, totalRounds, modes = [], currentModeIndex = 0 } = discussion;
    // 如果 totalRounds 未定义，使用 modes.length（至少为1）
    const actualTotalRounds = totalRounds || modes.length || 1;
    // 获取当前模式
    const currentMode = modes[currentModeIndex] || 'brainstorm';

    // 使用预存储的时间线事件作为基础
    const hasStoredEvents = discussion.timelineEvents && discussion.timelineEvents.length > 0;
    if (hasStoredEvents) {
      events.push(...discussion.timelineEvents);
    } else {
      // 没有预存储事件时，从消息历史重建
      events.push({
        type: 'discussion-start',
        timestamp: discussion.createdAt,
        title: discussion.title
      });

      // 基于消息历史重建时间线
      let lastMode = null;
      let lastRound = 0;

      messages.forEach(msg => {
      const msgTime = msg.timestamp || discussion.updatedAt;
      const msgMode = msg.mode;
      const msgRound = msg.round;
      const msgModeIndex = msg.modeIndex !== undefined ? msg.modeIndex : 0;

      // 模式切换事件
      if (msgMode && msgMode !== lastMode) {
        events.push({
          type: 'mode-start',
          timestamp: msgTime,
          mode: msgMode,
          modeIndex: msgModeIndex,
          totalModes: modes.length || 1
        });
        lastMode = msgMode;
        lastRound = 0; // 重置轮次
      }

      // 轮次开始事件
      if (msgRound && msgRound !== lastRound) {
        events.push({
          type: 'round-start',
          timestamp: msgTime,
          round: msgRound,
          totalRounds: totalRounds,
          mode: msgMode || 'round-table'
        });
        lastRound = msgRound;
      }

      // 模型响应
      if (msg.responses) {
        msg.responses.forEach(r => {
          events.push({
            type: 'model-response',
            timestamp: msgTime,
            modelName: r.model,
            content: r.content,
            round: msg.round,
            mode: msgMode
          });
        });
      }

      // 主持人汇总
      if (msg.hostSummary) {
        events.push({
          type: 'host-summary',
          timestamp: msgTime,
          modelName: msg.hostSummary.model,
          content: msg.hostSummary.content,
          stage: msg.hostSummary.stage,
          round: msg.round,
          mode: msgMode
        });
      }
    });
    }

    return events.sort((a, b) => {
      const timeA = new Date(a.timestamp);
      const timeB = new Date(b.timestamp);
      // 如果时间相同，按类型排序：mode-start < round-start < model-response < host-summary < model-status
      if (timeA.getTime() === timeB.getTime()) {
        const typeOrder = {
          'discussion-start': 0,
          'mode-start': 1,
          'round-start': 2,
          'model-response': 3,
          'host-summary': 4,
          'model-status': 5
        };
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      }
      return timeB - timeA;
    });
  }

  /**
   * 渲染时间线事件 (v3.0 - Vertical Timeline Design)
   */
  renderTimelineEvent(event, isLatest = false) {
    const time = this.formatTime(event.timestamp);

    switch (event.type) {
      case 'discussion-start':
        return this.renderSimpleEvent({
          time,
          icon: 'start',
          iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>',
          text: '<strong>Discussion started</strong>'
        });

      case 'mode-start':
        return this.renderSimpleEvent({
          time,
          icon: 'mode',
          iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
          text: `<strong>${this.getModeName(event.mode)}</strong> mode activated`
        });

      case 'mode-end':
        return this.renderSimpleEvent({
          time,
          icon: 'end',
          iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
          text: `<strong>${this.getModeName(event.mode)}</strong> completed`
        });

      case 'round-start':
        const totalRounds = event.totalRounds || this.currentDiscussion?.totalRounds || this.currentDiscussion?.modes?.length || 1;
        return this.renderSimpleEvent({
          time,
          icon: 'round',
          iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
          text: `Round <strong>${event.round}/${totalRounds}</strong> started`
        });

      case 'round-end':
        return this.renderSimpleEvent({
          time,
          icon: 'end',
          iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
          text: `Round <strong>${event.round}</strong> completed`
        });

      case 'round-execution':
        return this.renderRoundExecutionEvent(event, time, isLatest);

      case 'discussion-end':
        const isError = event.status === 'error';
        return this.renderSimpleEvent({
          time,
          icon: isError ? 'error' : 'end',
          iconSvg: isError
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
          text: isError ? '<strong>Discussion failed</strong>' : '<strong>Discussion completed</strong>'
        });

      default:
        return '';
    }
  }

  /**
   * 渲染简单事件 (discussion-start, mode-start, etc.)
   */
  renderSimpleEvent({ time, icon, iconSvg, text }) {
    return `
      <div class="timeline-event simple">
        <div class="timeline-axis">
          <div class="timeline-line"></div>
          <div class="timeline-dot completed"></div>
        </div>
        <div class="event-content">
          <div class="event-timestamp">${time}</div>
          <div class="simple-event">
            <div class="simple-event-icon ${icon}">${iconSvg}</div>
            <div class="simple-event-text">${text}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染轮次执行事件 (带模型徽章网格)
   */
  renderRoundExecutionEvent(event, time, isLatest) {
    const modelCount = event.models?.length || 0;
    const runningCount = event.models?.filter(m => m.status === 'running').length || 0;
    const completedCount = event.models?.filter(m => m.status === 'completed').length || 0;
    const errorCount = event.models?.filter(m => m.status === 'error').length || 0;

    console.log('[BottomPanel] renderRoundExecutionEvent:', {
      round: event.round,
      mode: event.mode,
      modelCount,
      runningCount,
      completedCount,
      errorCount,
      models: event.models?.map(m => ({ modelId: m.modelId, modelName: m.modelName, status: m.status }))
    });

    // 确定整体状态
    let statusClass = 'pending';
    let statusText = 'Waiting';
    let cardClass = '';
    let dotClass = '';

    if (runningCount > 0) {
      statusClass = 'running';
      statusText = `${runningCount} Running`;
      cardClass = 'active';
      dotClass = 'active';
    } else if (errorCount > 0 && completedCount + errorCount === modelCount) {
      statusClass = 'completed';
      statusText = 'Completed';
      cardClass = 'completed';
      dotClass = 'completed';
    } else if (completedCount === modelCount) {
      statusClass = 'completed';
      statusText = 'All Completed';
      cardClass = 'completed';
      dotClass = 'completed';
    }

    // 生成模型徽章网格
    const badgeGridHtml = event.models?.map(m => this.renderModelBadge(m)).join('') || '';

    return `
      <div class="timeline-event">
        <div class="timeline-axis">
          <div class="timeline-line"></div>
          <div class="timeline-dot ${dotClass}"></div>
        </div>
        <div class="event-content">
          <div class="event-timestamp">${time}</div>
          <div class="event-card ${cardClass}">
            <div class="event-header">
              <div>
                <span class="event-type">Round ${event.round}</span>
                <span class="event-mode">${this.getModeName(event.mode)}</span>
              </div>
              <span class="event-status ${statusClass}">${statusText}</span>
            </div>
            <div class="model-badge-grid">
              ${badgeGridHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染模型状态徽章
   */
  renderModelBadge(model) {
    const statusClass = model.status === 'running' ? 'running' :
                        model.status === 'completed' ? 'completed' :
                        model.status === 'error' ? 'error' : 'pending';

    let iconHtml = '';
    if (model.status === 'running') {
      iconHtml = '<span class="badge-pulse"></span>';
    } else if (model.status === 'completed') {
      iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
    } else if (model.status === 'error') {
      iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
    } else {
      iconHtml = '<span class="badge-dot"></span>';
    }

    const hostBadge = model.isHost ? '<span class="badge-host" title="Host">H</span>' : '';
    const displayName = this.shortenModelName(model.modelName);

    return `
      <div class="model-badge ${statusClass}" title="${Utils.escapeHtml(model.modelName)}: ${model.status}">
        <span class="badge-icon">${iconHtml}</span>
        <span class="badge-name">${Utils.escapeHtml(displayName)}</span>
        ${hostBadge}
      </div>
    `;
  }

  /**
   * 缩短模型名称显示
   */
  shortenModelName(name) {
    if (!name) return 'Unknown';
    // 提取主要模型名称
    const shortNames = {
      'gpt-4': 'GPT-4',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o mini',
      'claude-3-5-sonnet': 'Claude 3.5',
      'claude-3-opus': 'Claude 3',
      'claude-3-5-haiku': 'Claude Haiku',
      'deepseek-chat': 'DeepSeek',
      'deepseek-coder': 'DeepSeek Coder',
      'glm-4': 'GLM-4',
      'glm-4-plus': 'GLM-4+',
      'glm-4-flash': 'GLM-4F',
      'glm-4v': 'GLM-4V',
      'kimi': 'Kimi',
      'qwen': 'Qwen',
      'qwq': 'QwQ'
    };

    for (const [key, value] of Object.entries(shortNames)) {
      if (name.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // 如果超过8个字符，截断显示（改小以适应3列网格）
    if (name.length > 8) {
      return name.substring(0, 8) + '...';
    }

    return name;
  }

  /**
   * 获取模式名称 - 可读版本
   */
  getModeName(mode) {
    const names = {
      'brainstorm': 'Brainstorm',
      'round-table': 'Round Table',
      'debate': 'Debate'
    };
    return names[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  /**
   * 获取状态动作文本
   */
  getStatusAction(status, isHost = false) {
    if (isHost) {
      const hostActions = {
        pending: '[WAIT] waiting for round to complete',
        running: '[BUSY] summarizing...',
        completed: '[DONE] summary complete',
        error: '[ERR] summary failed'
      };
      return hostActions[status] || status;
    }
    const actions = {
      pending: '[WAIT] waiting to start',
      running: '[BUSY] thinking...',
      completed: '[DONE] response ready',
      error: '[ERR] request failed'
    };
    return actions[status] || status;
  }

  /**
   * 格式化时间戳
   */
  formatTime(isoString) {
    if (!isoString) return '--:--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour12: false });
  }

  /**
   * 设置讨论内容 - 时间线布局 (v2.0)
   */
  setDiscussionContent(discussion) {
    // 缓存讨论数据，以便在 render 后恢复
    this.currentDiscussion = discussion;

    console.log('[BottomPanel] setDiscussionContent 被调用', {
      hasDiscussion: !!discussion,
      discussionId: discussion?.id,
      title: discussion?.title,
      modelsCount: discussion?.models?.length,
      models: discussion?.models?.map(m => ({ modelId: m.modelId, name: m.name, status: m.status })),
      timelineEventsCount: discussion?.timelineEvents?.length,
      timelineEvents: discussion?.timelineEvents?.filter(e => e.type === 'round-execution').map(e => ({
        round: e.round,
        models: e.models?.map(m => ({ modelId: m.modelId, modelName: m.modelName, status: m.status }))
      }))
    });

    const content = this.querySelector('.panel-content');
    console.log('[BottomPanel] querySelector .panel-content 结果:', content);

    if (!content || !discussion) {
      console.log('[BottomPanel] 提前返回 - content:', !!content, 'discussion:', !!discussion);
      return;
    }

    // 智能获取 totalRounds：优先使用讨论对象的值，否则使用 modes.length，最后默认 1
    const { models = [], currentRound = 1, progress = 0, modes = [] } = discussion;
    const totalRounds = discussion.totalRounds || modes.length || 1;
    const events = this.generateTimelineEvents(discussion);

    console.log('[BottomPanel] 生成时间线', {
      modelsCount: models.length,
      models: models.map(m => ({ name: m.name, status: m.status, progress: m.progress, isHost: m.isHost })),
      eventsCount: events.length,
      currentRound,
      totalRounds,
      progress,
      discussionCurrentRound: discussion.currentRound,
      discussionTotalRounds: discussion.totalRounds
    });

    // 紧凑头部
    const headerHtml = `
      <div class="timeline-header">
        <span class="timeline-title">${Utils.escapeHtml(discussion.title || 'Discussion')}</span>
        <span class="timeline-meta">
          <span class="round-badge">R${currentRound}/${totalRounds}</span>
          <span class="progress-mini">${progress}%</span>
        </span>
      </div>
    `;

    // 时间线日志 - 按时间顺序显示，最新的在底部
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const timelineHtml = sortedEvents.length > 0
      ? sortedEvents.map((e, index) => this.renderTimelineEvent(e, index === sortedEvents.length - 1)).join('')
      : '<div class="timeline-empty">Waiting for events...</div>';

    content.innerHTML = `
      <div class="discussion-timeline">
        ${headerHtml}
        <div class="timeline-log" id="timeline-log">
          ${timelineHtml}
        </div>
      </div>
    `;

    // 自动滚动到底部
    const log = content.querySelector('#timeline-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  getHostStatusText(status) {
    const texts = {
      pending: '等待汇总',
      running: '汇总中...',
      completed: '汇总完成',
      error: '汇总出错'
    };
    return texts[status] || status || '等待汇总';
  }

  getStageText(stage) {
    const texts = {
      'brainstorm_summary': 'Brainstorm',
      'round_summary': 'Round',
      'round_final': 'Final',
      'debate_summary': 'Debate'
    };
    return texts[stage] || 'Summary';
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
