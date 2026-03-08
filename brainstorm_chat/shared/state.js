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
  }
};

// 导出模块
window.StateManager = StateManager;
