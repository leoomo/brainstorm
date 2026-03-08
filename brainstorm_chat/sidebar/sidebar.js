// AI 讨论助手 - Popup 主逻辑
(function() {
  'use strict';

  // 使用状态管理模块
  const state = StateManager.state;

  // DOM 元素
  const elements = {
    // 视图
    mainView: document.getElementById('main-view'),
    discussionView: document.getElementById('discussion-view'),
    configView: document.getElementById('config-view'),
    historyView: document.getElementById('history-view'),
    documentView: document.getElementById('document-view'),

    // 主界面
    requirementInput: document.getElementById('requirement-input'),
    modelList: document.getElementById('model-list'),
    modelCount: document.getElementById('model-count'),
    modeCount: document.getElementById('mode-count'),
    startBtn: document.getElementById('start-btn'),
    configBtn: document.getElementById('config-btn'),
    historyBtn: document.getElementById('history-btn'),

    // 讨论界面
    backBtn: document.getElementById('back-btn'),
    exportBtn: document.getElementById('export-btn'),
    modelStatus: document.getElementById('model-status'),
    roundIndicator: document.getElementById('round-indicator'),
    discussionMessages: document.getElementById('discussion-messages'),
    continueBtn: document.getElementById('continue-btn'),
    finishBtn: document.getElementById('finish-btn'),

    // 配置界面
    configBackBtn: document.getElementById('config-back-btn'),
    addModelBtn: document.getElementById('add-model-btn'),
    configList: document.getElementById('config-list'),
    configModal: document.getElementById('config-modal'),
    configForm: document.getElementById('config-form'),
    modalTitle: document.getElementById('modal-title'),
    cancelConfigBtn: document.getElementById('cancel-config-btn'),

    // 历史界面
    historyBackBtn: document.getElementById('history-back-btn'),
    historyList: document.getElementById('history-list'),

    // 文档界面
    docBackBtn: document.getElementById('doc-back-btn'),
    docExportBtn: document.getElementById('doc-export-btn'),
    documentContent: document.getElementById('document-content'),
    saveDocBtn: document.getElementById('save-doc-btn'),

    // 主题切换
    themeToggle: document.getElementById('theme-toggle')
  };

  // 初始化
  async function init() {
    initTheme();
    await loadApiConfigs();
    await loadHistory();
    bindEvents();
    setupMessageListener();
    renderModelList();
    updateSelectedModels(); // 初始化模型选择状态
    updateSelectedModes(); // 初始化模式选择状态
    updateStartButton();
  }

  // 主题管理
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', toggleTheme);
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  // 设置消息监听
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'STREAM_MESSAGE') {
        appendMessage(message.data);
      } else if (message.type === 'ROUND_COMPLETE') {
        onRoundComplete();
      } else if (message.type === 'ERROR') {
        // 用户友好的错误消息
        let userMessage = message.message;
        if (userMessage.includes('API key')) {
          userMessage = '请检查 API Key 配置';
        } else if (userMessage.includes('network') || userMessage.includes('fetch')) {
          userMessage = '网络连接失败，请检查网络';
        } else if (userMessage.includes('rate limit')) {
          userMessage = '请求过于频繁，请稍后重试';
        } else if (userMessage.includes('timeout')) {
          userMessage = '请求超时，请重试';
        }
        showToast('出错: ' + userMessage, 'error', 5000);
        state.isDiscussing = false;
      }
    });
  }

  // 绑定事件
  function bindEvents() {
    // 主界面
    elements.requirementInput.addEventListener('input', updateStartButton);
    elements.startBtn.addEventListener('click', startDiscussion);
    elements.configBtn.addEventListener('click', () => switchView('config'));
    elements.historyBtn.addEventListener('click', () => switchView('history'));

    // 讨论模式（多选）
    document.querySelectorAll('input[name="mode"]').forEach(checkbox => {
      // 添加初始选中状态
      if (checkbox.checked) {
        checkbox.closest('.radio-card').classList.add('selected');
      }

      checkbox.addEventListener('change', () => {
        const card = checkbox.closest('.radio-card');
        if (checkbox.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
        updateSelectedModes();
      });
    });

    // 讨论界面
    elements.backBtn.addEventListener('click', () => {
      if (state.isDiscussing) {
        if (confirm('讨论正在进行中，确定要返回吗？')) {
          state.isDiscussing = false;
          switchView('main');
        }
      } else {
        switchView('main');
      }
    });
    elements.exportBtn.addEventListener('click', exportCurrentDiscussion);
    elements.continueBtn.addEventListener('click', continueDiscussion);
    elements.finishBtn.addEventListener('click', generateDocument);

    // 配置界面
    elements.configBackBtn.addEventListener('click', () => switchView('main'));
    elements.addModelBtn.addEventListener('click', () => openConfigModal());
    elements.cancelConfigBtn.addEventListener('click', closeConfigModal);
    elements.configForm.addEventListener('submit', saveConfig);

    // 历史界面
    elements.historyBackBtn.addEventListener('click', () => switchView('main'));

    // 文档界面
    elements.docBackBtn.addEventListener('click', () => switchView('discussion'));
    elements.docExportBtn.addEventListener('click', exportDocument);
    elements.saveDocBtn.addEventListener('click', saveToHistory);

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter: 开始讨论
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!elements.startBtn.disabled && state.currentView === 'main') {
          e.preventDefault();
          startDiscussion();
        }
      }

      // Escape: 返回/关闭模态
      if (e.key === 'Escape') {
        if (elements.configModal.classList.contains('active')) {
          closeConfigModal();
        } else if (state.currentView === 'discussion') {
          elements.backBtn.click();
        } else if (state.currentView === 'config' || state.currentView === 'history' || state.currentView === 'document') {
          switchView('main');
        }
      }
    });
  }

  // 视图切换
  function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    switch (viewName) {
      case 'main':
        elements.mainView.classList.add('active');
        break;
      case 'discussion':
        elements.discussionView.classList.add('active');
        break;
      case 'config':
        elements.configView.classList.add('active');
        renderConfigList();
        break;
      case 'history':
        elements.historyView.classList.add('active');
        renderHistoryList();
        break;
      case 'document':
        elements.documentView.classList.add('active');
        break;
    }
    state.currentView = viewName;
  }

  // 加载 API 配置
  async function loadApiConfigs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiConfigs'], (result) => {
        state.apiConfigs = result.apiConfigs || [];
        // 如果没有配置，默认添加主流模型
        if (state.apiConfigs.length === 0) {
          state.apiConfigs = DEFAULT_MODELS.map(m => ({
            id: generateId(),
            name: m.name,
            provider: m.provider,
            model: m.model,
            endpoint: DEFAULT_ENDPOINTS[m.provider] || '',
            apiKey: '',
            enabled: false
          }));
          // 默认启用第一个
          if (state.apiConfigs.length > 0) {
            state.apiConfigs[0].enabled = true;
          }
          saveApiConfigs();
        }
        resolve();
      });
    });
  }

  // 保存 API 配置
  const saveApiConfigs = StateManager.saveApiConfigs.bind(StateManager);

  // 加载历史
  const loadHistory = StateManager.loadHistory.bind(StateManager);

  // 渲染模型列表
  function renderModelList() {
    // 显示所有模型，选择即启用
    elements.modelList.innerHTML = state.apiConfigs.map(config => `
      <label class="model-item ${config.enabled ? 'selected' : ''}" data-id="${config.id}">
        <input type="checkbox" value="${config.id}" ${config.enabled ? 'checked' : ''}>
        <span class="model-name">${escapeHtml(config.name)}</span>
        <span class="model-provider">${getProviderName(config.provider)}</span>
      </label>
    `).join('');

    // 绑定选择事件 - 选择即启用
    elements.modelList.querySelectorAll('.model-item').forEach(item => {
      const checkbox = item.querySelector('input');

      item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          checkbox.checked = !checkbox.checked;
        }
        // 更新选中状态和启用状态
        if (checkbox.checked) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
        // 选择即启用，取消选择即禁用
        const config = state.apiConfigs.find(c => c.id === checkbox.value);
        if (config) {
          config.enabled = checkbox.checked;
          saveApiConfigs();
        }
        updateSelectedModels();
      });

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
        // 选择即启用，取消选择即禁用
        const config = state.apiConfigs.find(c => c.id === checkbox.value);
        if (config) {
          config.enabled = checkbox.checked;
          saveApiConfigs();
        }
        updateSelectedModels();
      });
    });

    // 已启用的模型已在 HTML 中默认选中，同步状态
    updateSelectedModels();
  }

  // 更新已选模型
  function updateSelectedModels() {
    state.selectedModels = Array.from(elements.modelList.querySelectorAll('input:checked'))
      .map(input => input.value);

    // 更新选中计数徽章
    if (elements.modelCount) {
      const count = state.selectedModels.length;
      if (count > 0) {
        elements.modelCount.textContent = count;
        elements.modelCount.style.display = 'inline-flex';
      } else {
        elements.modelCount.style.display = 'none';
      }
    }

    updateStartButton();
  }

  // 更新已选讨论模式
  function updateSelectedModes() {
    state.discussionModes = Array.from(document.querySelectorAll('input[name="mode"]:checked'))
      .map(input => input.value);

    // 更新选中计数徽章
    if (elements.modeCount) {
      const count = state.discussionModes.length;
      if (count > 0) {
        elements.modeCount.textContent = count;
        elements.modeCount.style.display = 'inline-flex';
      } else {
        elements.modeCount.style.display = 'none';
      }
    }

    updateStartButton();
  }

  // 更新开始按钮状态
  function updateStartButton() {
    const hasRequirement = elements.requirementInput.value.trim().length > 0;
    const hasSelectedModels = state.selectedModels.length > 0;
    const hasSelectedModes = state.discussionModes.length > 0;
    elements.startBtn.disabled = !(hasRequirement && hasSelectedModels && hasSelectedModes);
  }

  // 开始讨论
  async function startDiscussion() {
    const requirement = elements.requirementInput.value.trim();
    if (!requirement || state.selectedModels.length === 0 || state.discussionModes.length === 0) return;

    // 初始化讨论状态
    state.isDiscussing = true;
    state.currentRound = 1;
    state.currentModeIndex = 0;
    state.messages = [];

    // 重置模型状态指示
    if (elements.modelStatus) {
      const statusDot = elements.modelStatus.querySelector('.model-status-dot');
      const statusText = elements.modelStatus.querySelector('.model-status-text');
      statusDot.className = 'model-status-dot waiting';
      statusText.textContent = '等待模型响应...';
    }

    state.currentDiscussion = {
      id: generateId(),
      title: requirement.substring(0, 30) + (requirement.length > 30 ? '...' : ''),
      modes: state.discussionModes,
      currentModeIndex: 0,
      models: state.selectedModels,
      requirement: requirement,
      messages: [],
      createdAt: new Date().toISOString()
    };

    switchView('discussion');
    renderDiscussionMessages();
    updateRoundIndicator();

    // 开始第一个模式的讨论
    await runCurrentMode(requirement);
  }

  // 执行当前模式的讨论
  async function runCurrentMode(requirement) {
    const currentMode = state.discussionModes[state.currentModeIndex];
    const modeName = getModeName(currentMode);

    // 更新界面显示当前模式
    elements.roundIndicator.innerHTML = `<span class="mode-tag">${modeName}</span> Round ${state.currentRound}/${state.maxRounds}`;

    try {
      await chrome.runtime.sendMessage({
        type: 'START_DISCUSSION',
        data: {
          requirement,
          mode: currentMode,
          models: state.selectedModels.map(id =>
            state.apiConfigs.find(c => c.id === id)
          ),
          round: state.currentRound
        }
      });
    } catch (error) {
      showToast('讨论出错: ' + error.message, 'error');
      state.isDiscussing = false;
    }
  }

  function renderDiscussionMessages() {
    elements.discussionMessages.innerHTML = state.messages.map(msg => `
      <div class="message ${msg.isHost ? 'host' : ''}">
        <div class="message-header">
          <span class="avatar">${msg.model.charAt(0).toUpperCase()}</span>
          <span>${msg.model}</span>
          ${msg.isHost ? '<span class="host-badge">主持人</span>' : ''}
          ${msg.isThinking ? '<span class="typing">思考中...</span>' : ''}
        </div>
        <div class="message-content ${msg.isThinking ? 'typing' : ''}">${escapeHtml(msg.content)}</div>
      </div>
    `).join('');

    // 滚动到底部
    elements.discussionMessages.scrollTop = elements.discussionMessages.scrollHeight;
  }

  // 追加消息
  function appendMessage(data) {
    const existingIndex = state.messages.findIndex(m => m.model === data.model);

    if (existingIndex >= 0) {
      // 更新现有消息
      state.messages[existingIndex].content = data.content;
      state.messages[existingIndex].isThinking = data.isThinking;
    } else {
      // 新增消息
      state.messages.push({
        model: data.model,
        content: data.content,
        isThinking: data.isThinking
      });
    }

    renderDiscussionMessages();

    // 更新模型状态指示
    updateModelStatus(data.model, data.isThinking);

    // 保存到当前讨论
    state.currentDiscussion.messages = [...state.messages];
  }

  // 更新模型状态指示器
  function updateModelStatus(modelName, isThinking) {
    if (!elements.modelStatus) return;

    const statusDot = elements.modelStatus.querySelector('.model-status-dot');
    const statusText = elements.modelStatus.querySelector('.model-status-text');

    if (isThinking) {
      statusDot.className = 'model-status-dot active';
      statusText.textContent = `${modelName} 思考中...`;
    } else {
      statusDot.className = 'model-status-dot';
      statusText.textContent = `${modelName} 已响应`;
    }
  }

  // 更新轮次指示器
  function updateRoundIndicator() {
    elements.roundIndicator.textContent = `Round ${state.currentRound}/${state.maxRounds}`;
  }

  // 轮次完成
  function onRoundComplete() {
    state.isDiscussing = false;

    const isLastMode = state.currentModeIndex >= state.discussionModes.length - 1;

    if (isLastMode) {
      // 最后一个模式，检查轮数
      elements.continueBtn.disabled = state.currentRound >= state.maxRounds;
      if (state.currentRound >= state.maxRounds) {
        showToast('已达到默认讨论轮数，点击"继续讨论"增加轮次', 'success');
      }
    } else {
      // 还有下一个模式，自动切换
      elements.continueBtn.disabled = false;
    }

    elements.finishBtn.disabled = false;
  }

  // 继续讨论
  async function continueDiscussion() {
    const isLastMode = state.currentModeIndex >= state.discussionModes.length - 1;

    // 检查是否需要切换到下一个模式
    if (isLastMode) {
      // 当前是最后一个模式，检查轮数
      if (state.currentRound >= 10) {
        showToast('已达到最大讨论轮数 (10轮)', 'error');
        return;
      }
      // 继续当前模式的下一轮
      state.currentRound++;
    } else {
      // 切换到下一个模式
      state.currentModeIndex++;
      state.currentRound = 1; // 新模式从第一轮开始
      showToast('切换到 ' + getModeName(state.discussionModes[state.currentModeIndex]), 'success');
    }

    state.isDiscussing = true;
    elements.continueBtn.disabled = true;
    updateRoundIndicator();

    // 继续讨论
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CONTINUE_DISCUSSION',
        data: {
          messages: state.messages,
          mode: state.discussionModes[state.currentModeIndex],
          models: state.selectedModels.map(id =>
            state.apiConfigs.find(c => c.id === id)
          ),
          round: state.currentRound
        }
      });

      if (response && response.type === 'ROUND_COMPLETE') {
        onRoundComplete();
      }
    } catch (error) {
      showToast('继续讨论失败: ' + error.message, 'error');
      state.isDiscussing = false;
    }
  }

  // 生成文档
  async function generateDocument() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_DOCUMENT',
        data: {
          messages: state.messages,
          requirement: state.currentDiscussion.requirement
        }
      });

      if (response && response.type === 'DOCUMENT_GENERATED') {
        state.currentDiscussion.finalDoc = response.data.document;
        elements.documentContent.innerHTML = marked.parse(response.data.document);
        switchView('document');
        elements.exportBtn.disabled = false;
      }
    } catch (error) {
      showToast('生成文档失败: ' + error.message, 'error');
    }
  }

  // 导出当前讨论
  function exportCurrentDiscussion() {
    const content = state.messages.map(m => `## ${m.model}\n\n${m.content}`).join('\n\n---\n\n');
    downloadFile('discussion.md', content);
  }

  // 导出文档
  function exportDocument() {
    downloadFile('product-document.md', state.currentDiscussion.finalDoc);
  }

  // 保存到历史
  async function saveToHistory() {
    state.history.unshift(state.currentDiscussion);
    await StateManager.saveHistory();
    showToast('已保存到历史', 'success');
  }

  // 渲染配置列表
  function renderConfigList() {
    if (state.apiConfigs.length === 0) {
      elements.configList.innerHTML = '<div class="history-empty">暂无配置</div>';
      return;
    }

    elements.configList.innerHTML = state.apiConfigs.map(config => `
      <div class="config-item ${config.enabled ? '' : 'disabled'}" data-id="${config.id}">
        <div class="config-info">
          <div class="config-name">
            ${escapeHtml(config.name)}
            <span class="config-badge ${config.enabled ? 'enabled' : 'disabled'}">${config.enabled ? '已启用' : '已禁用'}</span>
          </div>
          <div class="config-provider">${getProviderName(config.provider)}</div>
        </div>
        <div class="config-actions">
          <button class="btn btn-secondary edit-config-btn">编辑</button>
          <button class="btn btn-danger delete-config-btn">删除</button>
        </div>
      </div>
    `).join('');

    // 绑定事件
    elements.configList.querySelectorAll('.config-item').forEach(item => {
      const id = item.dataset.id;

      item.querySelector('.edit-config-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const config = state.apiConfigs.find(c => c.id === id);
        if (config) openConfigModal(config);
      });

      item.querySelector('.delete-config-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('确定要删除这个配置吗？')) {
          state.apiConfigs = state.apiConfigs.filter(c => c.id !== id);
          saveApiConfigs().then(() => {
            renderConfigList();
            renderModelList();
            showToast('删除成功', 'success');
          });
        }
      });
    });
  }

  // 打开配置弹窗
  function openConfigModal(config = null) {
    elements.modalTitle.textContent = config ? '编辑模型' : '添加模型';
    elements.configForm.reset();
    document.getElementById('config-id').value = config ? config.id : '';

    if (config) {
      document.getElementById('config-name').value = config.name;
      document.getElementById('config-provider').value = config.provider;
      document.getElementById('config-model').value = config.model || '';
      document.getElementById('config-endpoint').value = config.endpoint || '';
      document.getElementById('config-key').value = config.apiKey;
      document.getElementById('config-enabled').checked = config.enabled;
    }

    elements.configModal.classList.add('active');
  }

  // 关闭配置弹窗
  function closeConfigModal() {
    elements.configModal.classList.remove('active');
  }

  // 保存配置
  async function saveConfig(e) {
    e.preventDefault();

    const isEnabled = document.getElementById('config-enabled').checked;
    const name = document.getElementById('config-name').value.trim();
    const apiKey = document.getElementById('config-key').value.trim();

    // 验证 - 仅当启用时必填
    if (isEnabled) {
      if (!name) {
        showToast('请输入模型名称', 'warning');
        return;
      }
      if (!apiKey) {
        showToast('请输入 API Key', 'warning');
        return;
      }
    }

    const id = document.getElementById('config-id').value || generateId();
    const provider = document.getElementById('config-provider').value;
    const modelInput = document.getElementById('config-model').value.trim();

    const config = {
      id: id,
      name: name,
      provider: provider,
      model: modelInput || DEFAULT_MODELS.find(m => m.provider === provider)?.model || '',
      endpoint: document.getElementById('config-endpoint').value.trim() || DEFAULT_ENDPOINTS[provider] || '',
      apiKey: apiKey,
      enabled: document.getElementById('config-enabled').checked
    };

    const existingIndex = state.apiConfigs.findIndex(c => c.id === id);
    if (existingIndex >= 0) {
      state.apiConfigs[existingIndex] = config;
    } else {
      state.apiConfigs.push(config);
    }

    await saveApiConfigs();
    closeConfigModal();
    renderConfigList();
    renderModelList();
    updateStartButton();
    showToast('保存成功', 'success');
  }

  // 渲染历史列表
  function renderHistoryList() {
    if (state.history.length === 0) {
      elements.historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }

    elements.historyList.innerHTML = state.history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-title">${escapeHtml(item.title)}</div>
        <div class="history-meta">${formatDate(item.createdAt)} · ${getModeName(item.mode)} · ${item.models.length}个模型</div>
        <div class="history-actions">
          <button class="btn btn-secondary view-doc-btn">查看文档</button>
          <button class="btn btn-danger delete-history-btn">删除</button>
        </div>
      </div>
    `).join('');

    // 绑定事件
    elements.historyList.querySelectorAll('.history-item').forEach(item => {
      const id = item.dataset.id;

      item.querySelector('.view-doc-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const history = state.history.find(h => h.id === id);
        if (history && history.finalDoc) {
          state.currentDiscussion = history;
          elements.documentContent.innerHTML = marked.parse(history.finalDoc);
          switchView('document');
        } else {
          showToast('该记录无文档', 'error');
        }
      });

      item.querySelector('.delete-history-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('确定要删除这条历史记录吗？')) {
          state.history = state.history.filter(h => h.id !== id);
          StateManager.saveHistory().then(() => {
            renderHistoryList();
            showToast('删除成功', 'success');
          });
        }
      });
    });
  }

  // 内置默认端点
  const DEFAULT_ENDPOINTS = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com',
    'deepseek': 'https://api.deepseek.com/v1',
    'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'glm': 'https://open.bigmodel.cn/api/paas/v4',
    'moonshot': 'https://api.moonshot.cn/v1',
    'ernie': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    'spark': 'https://spark-api-open.xf-yun.com/v1/chat/completions'
  };

  // 内置默认模型
  const DEFAULT_MODELS = [
    { name: 'GPT-4', provider: 'openai', model: 'gpt-4o' },
    { name: 'Claude', provider: 'anthropic', model: 'claude-3-opus' },
    { name: 'DeepSeek', provider: 'deepseek', model: 'deepseek-chat' },
    { name: '通义千问', provider: 'qwen', model: 'qwen-plus' },
    { name: 'GLM-4', provider: 'glm', model: 'glm-4-plus' },
    { name: 'Kimi', provider: 'moonshot', model: 'moonshot-v1-8k' }
  ];

  // 工具函数 - 使用模块
  const generateId = Utils.generateId;

  const escapeHtml = Utils.escapeHtml;

  const getProviderName = Utils.getProviderName;
  const getModeName = Utils.getModeName;
  const downloadFile = Utils.downloadFile;
  const formatDate = Utils.formatDate;

  function showToast(message, type = 'info', duration = 3000) {
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
  }

  // 显示加载状态
  function showLoading(element, text = '加载中...') {
    element.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span class="loading-text">${text}</span>
      </div>
    `;
  }

  // 启动
  document.addEventListener('DOMContentLoaded', init);
})();
