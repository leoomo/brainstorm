// AI 讨论助手 - 状态管理模块

const StateManager = {
  // 应用状态
  state: {
    currentView: 'main',
    apiConfigs: [],
    selectedModels: [],
    discussionModes: ['round-table'],
    currentModeIndex: 0,
    currentDiscussion: null,
    currentRound: 1,
    maxRounds: 3,
    isDiscussing: false,
    messages: [],
    // 项目管理
    projects: [],
    currentProjectId: null
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

  // 重置讨论状态
  resetDiscussion() {
    this.setState({
      currentRound: 1,
      currentModeIndex: 0,
      messages: [],
      currentDiscussion: null,
      isDiscussing: false
    });
  },

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

  // ========== 项目管理方法 ==========

  // 生成唯一 ID
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

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

    // 如果删除的是当前项目，切换到第一个
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
  },

  // 更新项目名称
  async updateProjectName(projectId, name) {
    const project = this.state.projects.find(p => p.id === projectId);
    if (project) {
      project.name = name;
      project.updatedAt = new Date().toISOString();
      await this.saveProjects();
    }
  },

  // 添加讨论到当前项目
  async addDiscussionToProject(discussion) {
    const project = this.getCurrentProject();
    if (project) {
      const projectDiscussion = {
        id: this.generateId('disc'),
        ...discussion,
        createdAt: new Date().toISOString()
      };
      project.discussions.push(projectDiscussion);
      project.updatedAt = new Date().toISOString();
      await this.saveProjects();
      return projectDiscussion;
    }
    return null;
  },

  // 获取当前项目的讨论列表
  getDiscussions() {
    const project = this.getCurrentProject();
    return project ? project.discussions : [];
  },

  // 删除讨论
  async deleteDiscussion(discussionId) {
    const project = this.getCurrentProject();
    if (project) {
      project.discussions = project.discussions.filter(d => d.id !== discussionId);
      project.updatedAt = new Date().toISOString();
      await this.saveProjects();
    }
  },

  // 获取讨论标题（自动生成）
  getDiscussionTitle(projectName, discussionIndex) {
    return `${projectName} - 第${discussionIndex}次讨论`;
  },

  // ========== 进行中讨论持久化 ==========

  // 保存当前讨论（用于页面刷新后恢复）
  async saveCurrentDiscussion() {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        currentDiscussion: this.state.currentDiscussion,
        isDiscussing: this.state.isDiscussing,
        currentRound: this.state.currentRound,
        currentModeIndex: this.state.currentModeIndex,
        messages: this.state.messages
      }, resolve);
    });
  },

  // 加载当前讨论
  async loadCurrentDiscussion() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['currentDiscussion', 'isDiscussing', 'currentRound', 'currentModeIndex', 'messages'], (result) => {
        this.state.currentDiscussion = result.currentDiscussion || null;
        this.state.isDiscussing = result.isDiscussing || false;
        this.state.currentRound = result.currentRound || 1;
        this.state.currentModeIndex = result.currentModeIndex || 0;
        this.state.messages = result.messages || [];
        resolve(this.state.currentDiscussion);
      });
    });
  },

  // 清除当前讨论（讨论已完成保存后调用）
  async clearCurrentDiscussion() {
    this.state.currentDiscussion = null;
    this.state.isDiscussing = false;
    this.state.currentRound = 1;
    this.state.currentModeIndex = 0;
    this.state.messages = [];
    return new Promise((resolve) => {
      chrome.storage.local.remove(['currentDiscussion', 'isDiscussing', 'currentRound', 'currentModeIndex', 'messages'], resolve);
    });
  }
};

// 导出模块
window.StateManager = StateManager;
