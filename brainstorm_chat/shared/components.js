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

    // 添加当前模型状态
    // 使用一个稍晚的时间戳，确保在时间相同时 model-status 排在其他事件之后
    const baseTime = new Date(discussion.updatedAt).getTime();
    console.log('[BottomPanel] 处理模型状态:', models.map(m => ({ name: m.name, status: m.status, progress: m.progress, isHost: m.isHost })));
    models.forEach((model, index) => {
      // 只添加正在运行或有特殊状态的模型
      const shouldAdd = model.status === 'running' || model.progress > 0;
      console.log('[BottomPanel] 检查模型:', model.name, 'status:', model.status, 'progress:', model.progress, 'shouldAdd:', shouldAdd);
      if (shouldAdd) {
        events.push({
          type: 'model-status',
          timestamp: new Date(baseTime + 1000 + index * 10), // +1秒确保排在其他事件后
          modelId: model.modelId,
          modelName: model.name,
          status: model.status,
          progress: model.progress,
          isHost: model.isHost
        });
      }
    });

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
      return timeA - timeB;
    });
  }

  /**
   * 渲染时间线事件 (v2.1 - Log Viewer Style)
   */
  renderTimelineEvent(event) {
    const time = this.formatTime(event.timestamp);
    const typeClass = event.type;

    switch (event.type) {
      case 'discussion-start':
        return `
          <div class="tl-event discussion-start">
            <span class="tl-time">${time}</span>
            <span class="tl-actor system">SYS</span>
            <span class="tl-action">[START] Discussion initialized</span>
          </div>
        `;

      case 'mode-start':
        return `
          <div class="tl-event mode-start">
            <span class="tl-time">${time}</span>
            <span class="tl-actor system">SYS</span>
            <span class="tl-action mode-label">
              → ${this.getModeName(event.mode)} mode (${event.modeIndex + 1}/${event.totalModes})
            </span>
          </div>
        `;

      case 'mode-end':
        return `
          <div class="tl-event mode-end">
            <span class="tl-time">${time}</span>
            <span class="tl-actor system">SYS</span>
            <span class="tl-action mode-label completed">
              [DONE] ${this.getModeName(event.mode)}
            </span>
          </div>
        `;

      case 'round-start':
        // 智能获取总轮次数：优先使用事件中的值，否则从讨论对象获取
        const eventTotalRounds = event.totalRounds || this.currentDiscussion?.totalRounds || this.currentDiscussion?.modes?.length || 1;
        return `
          <div class="tl-event round-start">
            <span class="tl-time">${time}</span>
            <span class="tl-actor system">SYS</span>
            <span class="tl-action round-label">○ Round ${event.round}/${eventTotalRounds}</span>
          </div>
        `;

      case 'round-end':
        return `
          <div class="tl-event round-end">
            <span class="tl-time">${time}</span>
            <span class="tl-actor system">SYS</span>
            <span class="tl-action round-label completed">[ROUND] ${event.round} done</span>
          </div>
        `;

      case 'model-status':
        return `
          <div class="tl-event ${typeClass} ${event.status}">
            <span class="tl-time">${time}</span>
            <span class="tl-actor ${event.isHost ? 'host' : ''}">${Utils.escapeHtml(event.modelName)}</span>
            <span class="tl-action">${this.getStatusAction(event.status, event.isHost)}</span>
            <span class="tl-status ${event.status}"></span>
          </div>
        `;

      case 'model-response':
        return `
          <div class="tl-event ${typeClass}">
            <span class="tl-time">${time}</span>
            <span class="tl-actor">${Utils.escapeHtml(event.modelName)}</span>
            <span class="tl-action response-preview">${Utils.escapeHtml(event.content?.substring(0, 60) || '')}</span>
          </div>
        `;

      case 'host-summary':
        return `
          <div class="tl-event host-summary">
            <span class="tl-time">${time}</span>
            <span class="tl-actor host">
              <svg class="icon-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
              HOST
            </span>
            <span class="tl-stage">${this.getStageText(event.stage)}</span>
            <div class="tl-summary">${Utils.escapeHtml(event.content?.substring(0, 120) || '')}</div>
          </div>
        `;

      default:
        return '';
    }
  }

  /**
   * 获取模式名称 - 简短版本
   */
  getModeName(mode) {
    const names = {
      'brainstorm': 'BRAIN',
      'round-table': 'TABLE',
      'debate': 'DEBATE'
    };
    return names[mode] || mode.toUpperCase();
  }

  /**
   * 获取状态动作文本
   */
  getStatusAction(status, isHost = false) {
    if (isHost) {
      const hostActions = {
        pending: 'waiting',
        running: 'summarizing...',
        completed: 'done',
        error: 'failed'
      };
      return hostActions[status] || status;
    }
    const actions = {
      pending: 'waiting',
      running: 'thinking...',
      completed: 'done',
      error: 'failed'
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
      modelsCount: discussion?.models?.length
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

    // 时间线日志
    const timelineHtml = events.length > 0
      ? events.map(e => this.renderTimelineEvent(e)).join('')
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
