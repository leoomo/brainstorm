// AI 讨论助手 - 状态管理模块 (重构版 - 支持多讨论)

const StateManager = {
  // 应用状态
  state: {
    // 视图状态
    currentView: 'main',
    panelState: 'collapsed', // 'collapsed' | 'expanded' | 'fullscreen'

    // 配置
    apiConfigs: [],
    selectedModels: [],
    discussionModes: ['round-table'],
    currentModeIndex: 0,
    maxRounds: 3,

    // 多讨论管理
    discussions: [], // 所有讨论 (活跃 + 已完成)
    activeDiscussionId: null, // 当前选中的讨论ID
    maxConcurrentDiscussions: 3,
    maxArchivedDiscussions: 20,

    // 项目管理
    projects: [],
    currentProjectId: null,

    // 向后兼容 (即将移除)
    currentDiscussion: null,
    currentRound: 1,
    isDiscussing: false,
    messages: [],
    history: []
  },

  // 订阅者列表
  subscribers: {},

  // 订阅状态变化
  subscribe(key, callback) {
    if (!this.subscribers[key]) {
      this.subscribers[key] = [];
    }
    this.subscribers[key].push(callback);
  },

  // 通知订阅者
  notify(key, value) {
    if (this.subscribers[key]) {
      this.subscribers[key].forEach(callback => callback(value));
    }
  },

  // 更新状态
  setState(updates) {
    Object.keys(updates).forEach(key => {
      if (this.state.hasOwnProperty(key)) {
        this.state[key] = updates[key];
        this.notify(key, updates[key]);
      }
    });
  },

  // 获取状态
  getState() {
    return { ...this.state };
  },

  // ========== 讨论管理方法 ==========

  // 生成唯一 ID
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 创建新讨论
  createDiscussion(requirement, models, modes) {
    const now = new Date().toISOString();
    const modelStatuses = models.map(m => ({
      modelId: m.id || m.name,
      name: m.name,
      provider: m.provider,
      status: 'pending', // 'pending' | 'running' | 'completed' | 'error'
      progress: 0,
      response: null,
      error: null
    }));

    // 支持单模式字符串或多模式数组
    const modesArray = Array.isArray(modes) ? modes : [modes];

    return {
      id: this.generateId('disc'),
      title: this.generateDiscussionTitle(requirement),
      requirement,
      models: modelStatuses,
      modes: modesArray, // 模式数组
      currentModeIndex: 0, // 当前执行的模式索引
      status: 'running', // 'running' | 'paused' | 'completed' | 'error'
      progress: 0,
      currentRound: 1,
      totalRounds: this.state.maxRounds,
      messages: [],
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
  },

  // 生成讨论标题
  generateDiscussionTitle(requirement) {
    // 取前20个字符作为标题
    const shortReq = requirement.length > 20
      ? requirement.substring(0, 20) + '...'
      : requirement;
    return shortReq;
  },

  // 检查是否可以启动新讨论
  canStartNewDiscussion() {
    const runningCount = this.state.discussions.filter(
      d => d.status === 'running'
    ).length;
    return runningCount < this.state.maxConcurrentDiscussions;
  },

  // 添加讨论
  async addDiscussion(discussion) {
    this.state.discussions.unshift(discussion);
    this.state.activeDiscussionId = discussion.id;

    // 清理旧讨论
    await this.archiveOldDiscussions();
    await this.saveDiscussions();

    this.notify('discussions', this.state.discussions);
    this.notify('activeDiscussionId', this.state.activeDiscussionId);

    return discussion;
  },

  // 更新讨论进度
  updateDiscussionProgress(discussionId, updates) {
    const discussion = this.state.discussions.find(d => d.id === discussionId);
    if (!discussion) return null;

    Object.assign(discussion, updates, { updatedAt: new Date().toISOString() });

    // 如果完成了，记录完成时间
    if (updates.status === 'completed' && !discussion.completedAt) {
      discussion.completedAt = new Date().toISOString();
    }

    this.notify('discussions', this.state.discussions);
    this.saveDiscussions();

    return discussion;
  },

  // 更新模型状态
  updateModelStatus(discussionId, modelId, statusUpdate) {
    const discussion = this.state.discussions.find(d => d.id === discussionId);
    if (!discussion) return null;

    const model = discussion.models.find(m => m.modelId === modelId);
    if (!model) return null;

    Object.assign(model, statusUpdate);

    // 重新计算整体进度
    const totalProgress = discussion.models.reduce((sum, m) => sum + (m.progress || 0), 0);
    discussion.progress = Math.round(totalProgress / discussion.models.length);

    this.notify('discussions', this.state.discussions);
    this.saveDiscussions();

    return discussion;
  },

  // 获取活跃讨论
  getActiveDiscussions() {
    return this.state.discussions.filter(d => d.status === 'running');
  },

  // 获取已完成讨论
  getCompletedDiscussions() {
    return this.state.discussions.filter(d => d.status === 'completed');
  },

  // 获取当前选中的讨论
  getActiveDiscussion() {
    if (!this.state.activeDiscussionId) return null;
    return this.state.discussions.find(d => d.id === this.state.activeDiscussionId);
  },

  // 设置当前选中讨论
  setActiveDiscussion(discussionId) {
    this.state.activeDiscussionId = discussionId;
    this.notify('activeDiscussionId', discussionId);
    this.saveDiscussions();
  },

  // 清理旧讨论 (保留最近20个已完成)
  async archiveOldDiscussions() {
    const completed = this.state.discussions.filter(d => d.status === 'completed');
    const running = this.state.discussions.filter(d => d.status === 'running');
    const others = this.state.discussions.filter(
      d => d.status !== 'completed' && d.status !== 'running'
    );

    // 只保留最近的20个已完成讨论
    if (completed.length > this.state.maxArchivedDiscussions) {
      completed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      completed.splice(this.state.maxArchivedDiscussions);
    }

    this.state.discussions = [...running, ...completed, ...others];
  },

  // 删除讨论
  async deleteDiscussion(discussionId) {
    this.state.discussions = this.state.discussions.filter(d => d.id !== discussionId);

    // 如果删除的是当前选中，重置选中
    if (this.state.activeDiscussionId === discussionId) {
      const running = this.getActiveDiscussions();
      this.state.activeDiscussionId = running[0]?.id || null;
      this.notify('activeDiscussionId', this.state.activeDiscussionId);
    }

    await this.saveDiscussions();
    this.notify('discussions', this.state.discussions);
  },

  // 设置面板状态
  setPanelState(state) {
    this.state.panelState = state;
    this.notify('panelState', state);
  },

  // ========== 持久化 ==========

  // 保存讨论列表
  async saveDiscussions() {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        discussions: this.state.discussions,
        activeDiscussionId: this.state.activeDiscussionId,
        panelState: this.state.panelState
      }, resolve);
    });
  },

  // 加载讨论列表
  async loadDiscussions() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'discussions',
        'activeDiscussionId',
        'panelState',
        // 向后兼容
        'currentDiscussion',
        'isDiscussing',
        'currentRound',
        'messages'
      ], (result) => {
        // 加载新格式
        if (result.discussions && result.discussions.length > 0) {
          this.state.discussions = result.discussions;
          this.state.activeDiscussionId = result.activeDiscussionId || null;
          this.state.panelState = result.panelState || 'collapsed';

          // 扩展重启后，running 状态的讨论实际上已停止，改为 paused
          let needsSave = false;
          this.state.discussions.forEach(d => {
            if (d.status === 'running') {
              d.status = 'paused';
              d.updatedAt = new Date().toISOString();
              needsSave = true;
            }
          });
          if (needsSave) {
            this.saveDiscussions();
          }
        }
        // 向后兼容：迁移旧数据
        else if (result.currentDiscussion && result.isDiscussing) {
          this.migrateFromOldFormat(result);
        }

        resolve(this.state.discussions);
      });
    });
  },

  // 从旧格式迁移
  migrateFromOldFormat(result) {
    const oldDiscussion = {
      id: this.generateId('disc'),
      title: this.generateDiscussionTitle(result.currentDiscussion?.requirement || '未命名讨论'),
      requirement: result.currentDiscussion?.requirement || '',
      models: result.currentDiscussion?.models || [],
      mode: result.currentDiscussion?.mode || 'round-table',
      status: result.isDiscussing ? 'running' : 'completed',
      progress: result.isDiscussing ? 50 : 100,
      currentRound: result.currentRound || 1,
      totalRounds: 3,
      messages: result.messages || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: result.isDiscussing ? null : new Date().toISOString()
    };

    this.state.discussions = [oldDiscussion];
    this.state.activeDiscussionId = oldDiscussion.id;
    this.state.panelState = 'expanded';

    // 清理旧数据
    chrome.storage.local.remove([
      'currentDiscussion',
      'isDiscussing',
      'currentRound',
      'currentModeIndex',
      'messages'
    ]);

    this.saveDiscussions();
  },

  // ========== 配置管理 ==========

  // 加载配置
  async loadApiConfigs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiConfigs'], (result) => {
        this.state.apiConfigs = result.apiConfigs || [];
        resolve(this.state.apiConfigs);
      });
    });
  },

  // 保存配置
  async saveApiConfigs() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ apiConfigs: this.state.apiConfigs }, resolve);
    });
  },

  // 加载选中的模型
  async loadSelectedModels() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['selectedModels'], (result) => {
        this.state.selectedModels = result.selectedModels || [];
        resolve(this.state.selectedModels);
      });
    });
  },

  // 保存选中的模型
  async saveSelectedModels() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ selectedModels: this.state.selectedModels }, resolve);
    });
  },

  // ========== 历史记录 (兼容旧版本) ==========

  // 加载历史
  async loadHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['history'], (result) => {
        this.state.history = result.history || [];
        resolve(this.state.history);
      });
    });
  },

  // 保存历史
  async saveHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ history: this.state.history }, resolve);
    });
  },

  // ========== 项目管理 ==========

  // 加载项目
  async loadProjects() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['projects', 'currentProjectId'], (result) => {
        this.state.projects = result.projects || [];
        this.state.currentProjectId = result.currentProjectId || null;

        // 如果没有项目，自动创建默认项目
        if (this.state.projects.length === 0) {
          const defaultProject = this.createProject('默认项目');
          this.state.projects = [defaultProject];
          this.state.currentProjectId = defaultProject.id;
          this.saveProjects();
        }

        resolve(this.state.projects);
      });
    });
  },

  // 保存项目
  async saveProjects() {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        projects: this.state.projects,
        currentProjectId: this.state.currentProjectId
      }, resolve);
    });
  },

  // 创建项目
  createProject(name) {
    const now = new Date().toISOString();
    return {
      id: this.generateId('proj'),
      name: name,
      createdAt: now,
      updatedAt: now,
      discussions: []
    };
  },

  // 添加项目
  async addProject(name) {
    const project = this.createProject(name);
    this.state.projects.push(project);
    await this.saveProjects();
    return project;
  },

  // 删除项目
  async deleteProject(projectId) {
    this.state.projects = this.state.projects.filter(p => p.id !== projectId);

    if (this.state.currentProjectId === projectId) {
      this.state.currentProjectId = this.state.projects[0]?.id || null;
    }

    await this.saveProjects();
  },

  // 切换当前项目
  async switchProject(projectId) {
    this.state.currentProjectId = projectId;
    await this.saveProjects();
  },

  // 获取当前项目
  getCurrentProject() {
    return this.state.projects.find(p => p.id === this.state.currentProjectId);
  }
};

// 导出模块
window.StateManager = StateManager;
