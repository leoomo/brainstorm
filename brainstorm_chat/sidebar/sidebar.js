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

    // 项目管理
    projectCurrent: document.getElementById('project-current'),
    projectDropdown: document.getElementById('project-dropdown'),
    projectList: document.getElementById('project-list'),
    currentProjectName: document.getElementById('current-project-name'),
    projectDiscussionCount: document.getElementById('project-discussion-count'),
    newProjectBtn: document.getElementById('new-project-btn'),
    deleteProjectBtn: document.getElementById('delete-project-btn'),
    projectModal: document.getElementById('project-modal'),
    projectForm: document.getElementById('project-form'),
    projectNameInput: document.getElementById('project-name-input'),
    cancelProjectBtn: document.getElementById('cancel-project-btn'),

    // 讨论列表
    discussionSection: document.getElementById('discussion-section'),
    discussionList: document.getElementById('discussion-list'),
    discussionListCount: document.getElementById('discussion-list-count'),

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
    await StateManager.loadSelectedModels(); // 加载保存的模型选择
    await StateManager.loadProjects(); // 加载项目
    await StateManager.loadCurrentDiscussion(); // 加载进行中的讨论
    initProjectSwitcher(); // 初始化项目切换器
    renderDiscussionList(); // 渲染讨论列表
    bindEvents();
    setupMessageListener();
    renderModelList();
    updateSelectedModels(); // 初始化模型选择状态
    updateSelectedModes(); // 初始化模式选择状态
    updateStartButton();
    restoreDiscussionIfNeeded(); // 恢复进行中的讨论
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

  // ========== 项目管理 ==========
  function initProjectSwitcher() {
    renderProjectList();
    updateProjectDisplay();
    bindProjectEvents();
  }

  function bindProjectEvents() {
    // 点击切换器展开/收起下拉
    elements.projectCurrent.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.projectDropdown.classList.toggle('show');
    });

    // 点击其他地方关闭下拉
    document.addEventListener('click', () => {
      elements.projectDropdown.classList.remove('show');
    });

    // 新建项目按钮
    elements.newProjectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.projectNameInput.value = '';
      elements.projectModal.classList.add('active');
      elements.projectNameInput.focus();
    });

    // 取消项目弹窗
    elements.cancelProjectBtn.addEventListener('click', () => {
      elements.projectModal.classList.remove('active');
    });

    // 提交项目表单
    elements.projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = elements.projectNameInput.value.trim();
      if (name) {
        const project = await StateManager.addProject(name);
        await StateManager.switchProject(project.id);
        renderProjectList();
        updateProjectDisplay();
        elements.projectModal.classList.remove('active');
      }
    });

    // 删除项目按钮
    elements.deleteProjectBtn.addEventListener('click', async () => {
      const currentProject = StateManager.getCurrentProject();
      if (currentProject && confirm(`确定要删除项目"${currentProject.name}"吗？该项目的所有讨论将被删除。`)) {
        await StateManager.deleteProject(currentProject.id);
        renderProjectList();
        updateProjectDisplay();
      }
    });
  }

  function renderProjectList() {
    const projects = StateManager.state.projects;
    const currentId = StateManager.state.currentProjectId;

    elements.projectList.innerHTML = projects.map(project => `
      <div class="project-item ${project.id === currentId ? 'active' : ''}" data-id="${project.id}">
        <span class="project-item-name">${escapeHtml(project.name)}</span>
        <span class="project-item-count">${project.discussions.length}次</span>
      </div>
    `).join('');

    // 绑定点击项目切换
    elements.projectList.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', async () => {
        const projectId = item.dataset.id;
        await StateManager.switchProject(projectId);
        renderProjectList();
        updateProjectDisplay();
        elements.projectDropdown.classList.remove('show');
      });
    });
  }

  function updateProjectDisplay() {
    const project = StateManager.getCurrentProject();
    if (project) {
      elements.currentProjectName.textContent = project.name;
      elements.projectDiscussionCount.textContent = `${project.discussions.length}次讨论`;
    }
  }

  // ========== 讨论列表 ==========
  function renderDiscussionList() {
    const discussions = StateManager.getDiscussions();
    const hasActiveDiscussion = state.currentDiscussion !== null;

    // 显示/隐藏讨论区域
    if (discussions.length > 0 || hasActiveDiscussion) {
      elements.discussionSection.style.display = 'block';
    } else {
      elements.discussionSection.style.display = 'none';
      return;
    }

    // 构建讨论列表 HTML
    let html = '';

    // 进行中的讨论（优先显示）
    if (hasActiveDiscussion) {
      html += `
        <div class="discussion-item active" data-type="current">
          <div class="discussion-item-status">
            <span class="status-dot active"></span>
            <span class="status-text">进行中</span>
          </div>
          <div class="discussion-item-title">${escapeHtml(state.currentDiscussion.title || '未命名讨论')}</div>
          <div class="discussion-item-meta">${getModeName(state.currentDiscussion.modes?.[0])} · ${state.currentDiscussion.models?.length || 0}个模型</div>
        </div>
      `;
    }

    // 已完成的讨论
    discussions.forEach((disc, index) => {
      const isComplete = disc.finalDoc !== undefined;
      html += `
        <div class="discussion-item ${isComplete ? 'completed' : ''}" data-id="${disc.id}" data-index="${index}">
          <div class="discussion-item-status">
            <span class="status-dot ${isComplete ? 'completed' : ''}"></span>
            <span class="status-text">${isComplete ? '已完成' : '待处理'}</span>
          </div>
          <div class="discussion-item-title">${escapeHtml(disc.title || '未命名讨论')}</div>
          <div class="discussion-item-meta">${getModeName(disc.mode)} · ${formatDate(disc.createdAt)}</div>
        </div>
      `;
    });

    elements.discussionList.innerHTML = html;
    elements.discussionListCount.textContent = discussions.length + (hasActiveDiscussion ? 1 : 0);

    // 绑定点击事件
    bindDiscussionItemEvents();
  }

  function bindDiscussionItemEvents() {
    // 点击进行中的讨论 - 继续
    const activeItem = elements.discussionList.querySelector('[data-type="current"]');
    if (activeItem) {
      activeItem.addEventListener('click', () => {
        // 恢复讨论界面
        switchView('discussion');
        renderDiscussionMessages();
        updateRoundIndicator();
      });
    }

    // 点击已完成的讨论 - 查看文档
    elements.discussionList.querySelectorAll('.discussion-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        const discId = item.dataset.id;
        const discIndex = parseInt(item.dataset.index);
        const discussions = StateManager.getDiscussions();
        const disc = discussions[discIndex];

        if (disc && disc.finalDoc) {
          state.currentDiscussion = disc;
          elements.documentContent.innerHTML = marked.parse(disc.finalDoc);
          switchView('document');
        }
      });
    });
  }

  // 恢复进行中的讨论
  function restoreDiscussionIfNeeded() {
    if (state.currentDiscussion && state.isDiscussing) {
      // 有进行中的讨论，更新UI显示
      renderDiscussionList();
    }
  }

  // 保存进行中的讨论
  async function saveActiveDiscussion() {
    if (state.currentDiscussion) {
      state.currentDiscussion.messages = [...state.messages];
      await StateManager.saveCurrentDiscussion();
    }
  }

  // 清除进行中的讨论
  async function clearActiveDiscussion() {
    await StateManager.clearCurrentDiscussion();
    renderDiscussionList();
    renderProjectList();
    updateProjectDisplay();
  }

  // 设置消息监听
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ROUND_COMPLETE') {
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

        // 迁移逻辑：将 enabled 转换为 validated
        let needsSave = false;
        state.apiConfigs.forEach(config => {
          if ('enabled' in config && !('validated' in config)) {
            // 旧配置：enabled 转为 validated
            config.validated = config.enabled;
            delete config.enabled;
            needsSave = true;
          }
          // 确保有 validated 字段
          if (!('validated' in config)) {
            config.validated = false;
            needsSave = true;
          }
          // 修正错误的 endpoint
          if (config.provider === 'deepseek') {
            config.endpoint = 'https://api.deepseek.com/chat/completions';
            needsSave = true;
          } else if (config.provider === 'qwen') {
            config.endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
            needsSave = true;
          } else if (config.provider === 'glm') {
            config.endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            needsSave = true;
          } else if (config.provider === 'moonshot') {
            config.endpoint = 'https://api.moonshot.cn/v1/chat/completions';
            needsSave = true;
          } else if (config.provider === 'ernie') {
            config.endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/chat/completions_ernie';
            needsSave = true;
          } else if (config.provider === 'openai') {
            config.endpoint = 'https://api.openai.com/v1/chat/completions';
            needsSave = true;
          } else if (config.provider === 'anthropic') {
            config.endpoint = 'https://api.anthropic.com/v1/messages';
            needsSave = true;
          }
        });

        // 如果没有配置，默认添加主流模型
        if (state.apiConfigs.length === 0) {
          state.apiConfigs = DEFAULT_MODELS.map(m => ({
            id: generateId(),
            name: m.name,
            provider: m.provider,
            model: m.model,
            endpoint: DEFAULT_ENDPOINTS[m.provider] || '',
            apiKey: '',
            validated: false
          }));
          saveApiConfigs();
        } else if (needsSave) {
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

  // 渲染模型列表 - 芯片式设计
  function renderModelList() {
    // 空状态：没有配置任何模型
    if (state.apiConfigs.length === 0) {
      elements.modelList.innerHTML = `
        <div class="models-empty">
          <div class="models-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </div>
          <p class="models-empty-text">尚未配置任何模型</p>
          <span class="models-empty-action" id="add-model-from-list">点击添加模型</span>
        </div>
      `;

      // 绑定添加模型事件
      document.getElementById('add-model-from-list')?.addEventListener('click', () => {
        showConfigModal();
      });

      // 更新按钮状态
      state.selectedModels = [];
      updateStartButton();
      return;
    }

    // 获取保存的选择，如果没有保存则使用已启用的模型
    const savedSelection = state.selectedModels || [];
    const enabledModels = state.apiConfigs.filter(c => c.validated);
    const disabledModels = state.apiConfigs.filter(c => !c.validated);

    // 决定哪些模型应该被选中：优先使用保存的选择，否则使用已校验的
    const getInitialSelection = (configId) => {
      if (savedSelection.includes(configId)) return true;
      // 如果没有保存的选择，且模型已启用，则默认选中
      if (savedSelection.length === 0 && enabledModels.find(m => m.id === configId)) return true;
      return false;
    };

    // 已启用的模型 - 可选择
    const enabledChips = enabledModels.map(config => {
      const isSelected = getInitialSelection(config.id);
      return `
        <div class="model-chip ${isSelected ? 'selected' : ''}" data-id="${config.id}">
          <span class="model-chip-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span class="model-chip-name">${escapeHtml(config.name)}</span>
          <span class="model-chip-provider provider-${config.provider}">${config.provider.toUpperCase()}</span>
        </div>
      `;
    }).join('');

    // 未启用的模型（禁用状态）
    const disabledChips = disabledModels.map(config => `
      <div class="model-chip disabled" data-id="${config.id}" title="该模型未启用，请在配置中启用">
        <span class="model-chip-name">${escapeHtml(config.name)}</span>
        <span class="model-chip-provider provider-${config.provider}">${config.provider.toUpperCase()}</span>
      </div>
    `).join('');

    elements.modelList.innerHTML = enabledChips + disabledChips;

    // 添加提示文字
    const hint = document.createElement('p');
    hint.className = 'model-selection-hint';
    hint.textContent = '点击可用模型可取消选择';
    elements.modelList.appendChild(hint);

    // 绑定点击事件 - 已启用的模型可点击切换
    elements.modelList.querySelectorAll('.model-chip:not(.disabled)').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        updateSelectedModels();
        // 保存选择到存储（包括清空选择的情况）
        StateManager.saveSelectedModels();
      });
    });

    // 同步状态
    updateSelectedModels();
  }

  // 更新已选模型
  function updateSelectedModels() {
    // 从 UI 选中状态获取（不是从 config.enabled，这样用户可以临时取消选择）
    state.selectedModels = Array.from(elements.modelList.querySelectorAll('.model-chip.selected'))
      .map(chip => chip.dataset.id);

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

    // 检查是否有进行中的讨论
    if (state.currentDiscussion && state.isDiscussing) {
      const choice = confirm('已有进行中的讨论，是否新建讨论？\n\n确定：新建讨论（当前讨论将被中断）\n取消：继续当前讨论');
      if (!choice) {
        // 继续当前讨论
        switchView('discussion');
        renderDiscussionMessages();
        return;
      }
      // 用户选择新建，清除进行中的讨论
      await clearActiveDiscussion();
    }

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

    // 获取当前项目的讨论标题
    const project = StateManager.getCurrentProject();
    const discussionCount = project ? project.discussions.length + 1 : 1;
    const discussionTitle = project
      ? StateManager.getDiscussionTitle(project.name, discussionCount)
      : requirement.substring(0, 30) + (requirement.length > 30 ? '...' : '');

    state.currentDiscussion = {
      id: generateId(),
      title: discussionTitle,
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

    // 重试机制：尝试发送消息到 background
    const sendWithRetry = async (retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await chrome.runtime.sendMessage({
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

          // 检查运行时错误
          if (chrome.runtime.lastError) {
            console.warn('消息发送失败，尝试重试...', chrome.runtime.lastError.message);
            if (i < retries) {
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
            throw new Error(chrome.runtime.lastError.message);
          }

          return response;
        } catch (error) {
          console.error('发送消息错误:', error);
          if (i < retries) {
            await new Promise(r => setTimeout(r, 500));
          } else {
            throw error;
          }
        }
      }
    };

    try {
      const response = await sendWithRetry();

      // 处理返回的消息
      if (response && response.data && response.data.results) {
        response.data.results.forEach(result => {
          state.messages.push({
            model: result.model,
            content: result.content,
            isThinking: false
          });
        });
        renderDiscussionMessages();

        // 保存到当前讨论并持久化
        if (state.currentDiscussion) {
          state.currentDiscussion.messages = [...state.messages];
          await saveActiveDiscussion();
        }
      }

      // 标记当前轮完成
      onRoundComplete();
    } catch (error) {
      showToast('连接失败，请刷新页面重试', 'error');
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
  async function appendMessage(data) {
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

    // 保存到当前讨论并持久化
    state.currentDiscussion.messages = [...state.messages];
    await saveActiveDiscussion();
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
    // 保存到当前项目
    await StateManager.addDiscussionToProject({
      title: state.currentDiscussion.title,
      requirement: state.currentDiscussion.requirement,
      mode: state.currentDiscussion.modes[0],
      models: state.currentDiscussion.models,
      finalDoc: state.currentDiscussion.finalDoc
    });

    // 清除进行中的讨论状态
    await clearActiveDiscussion();

    // 同时保留到历史（兼容）
    state.history.unshift(state.currentDiscussion);
    await StateManager.saveHistory();

    showToast('已保存到项目', 'success');
  }

  // 渲染配置列表
  function renderConfigList() {
    if (state.apiConfigs.length === 0) {
      elements.configList.innerHTML = '<div class="history-empty">暂无配置</div>';
      return;
    }

    elements.configList.innerHTML = state.apiConfigs.map(config => `
      <div class="config-item ${config.validated ? '' : 'disabled'}" data-id="${config.id}">
        <div class="config-info">
          <div class="config-name">
            ${escapeHtml(config.name)}
            <span class="config-badge ${config.validated ? 'enabled' : 'disabled'}">${config.validated ? '可用' : '不可用'}</span>
          </div>
          <div class="config-provider">${getProviderName(config.provider)}</div>
          ${config.validationError ? `<div class="config-error">${escapeHtml(config.validationError)}</div>` : ''}
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

    // 重置校验状态
    const validationStatus = document.getElementById('validation-status');
    validationStatus.style.display = 'none';
    validationStatus.className = 'validation-status';

    if (config) {
      document.getElementById('config-name').value = config.name;
      document.getElementById('config-provider').value = config.provider;
      document.getElementById('config-model').value = config.model || '';
      document.getElementById('config-endpoint').value = config.endpoint || '';
      document.getElementById('config-key').value = config.apiKey;

      // 显示当前校验状态
      if (config.validated) {
        validationStatus.style.display = 'flex';
        validationStatus.className = 'validation-status success';
        validationStatus.querySelector('.validation-text').textContent = 'API 已验证可用';
      }
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

    const name = document.getElementById('config-name').value.trim();
    const apiKey = document.getElementById('config-key').value.trim();
    const id = document.getElementById('config-id').value || generateId();
    const provider = document.getElementById('config-provider').value;
    const modelInput = document.getElementById('config-model').value.trim();

    const validationStatus = document.getElementById('validation-status');
    validationStatus.style.display = 'flex';

    // 先检查必填字段（只有模型名称是必填的）
    let validationError = '';
    if (!name) {
      validationError = '请填写模型名称';
    }

    // 如果必填字段缺失，标记失败并显示原因，但仍然保存
    if (validationError) {
      validationStatus.className = 'validation-status error';
      validationStatus.querySelector('.validation-text').textContent = validationError;

      const config = {
        id: id,
        name: name || '未命名',
        provider: provider,
        model: modelInput || DEFAULT_MODELS.find(m => m.provider === provider)?.model || '',
        endpoint: getCorrectEndpoint(provider, document.getElementById('config-endpoint').value.trim()),
        apiKey: apiKey,
        validated: false,
        validationError: validationError
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
      showToast('保存成功，但 ' + validationError, 'warning');
      return;
    }

    // 如果没有填写 API Key，直接保存为未校验
    if (!apiKey) {
      validationStatus.className = 'validation-status error';
      validationStatus.querySelector('.validation-text').textContent = '未填写 API Key，已保存';

      const config = {
        id: id,
        name: name,
        provider: provider,
        model: modelInput || DEFAULT_MODELS.find(m => m.provider === provider)?.model || '',
        endpoint: getCorrectEndpoint(provider, document.getElementById('config-endpoint').value.trim()),
        apiKey: apiKey,
        validated: false,
        validationError: '未填写 API Key'
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
      showToast('保存成功，请填写 API Key 后再保存以进行校验', 'warning');
      return;
    }

    // API Key 已填写，进行校验
    validationStatus.className = 'validation-status validating';
    validationStatus.querySelector('.validation-text').textContent = '正在校验 API...';

    // 禁用提交按钮
    const submitBtn = elements.configForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '校验中...';

    // 校验 API
    const isValid = await validateApiKey(provider, apiKey, modelInput || DEFAULT_MODELS.find(m => m.provider === provider)?.model || '');

    // 更新校验状态显示
    if (isValid) {
      validationStatus.className = 'validation-status success';
      validationStatus.querySelector('.validation-text').textContent = 'API 校验成功';
    } else {
      validationStatus.className = 'validation-status error';
      validationStatus.querySelector('.validation-text').textContent = 'API 校验失败，请检查配置';
    }

    // 恢复按钮状态
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    // 保存配置
    const config = {
      id: id,
      name: name,
      provider: provider,
      model: modelInput || DEFAULT_MODELS.find(m => m.provider === provider)?.model || '',
      endpoint: document.getElementById('config-endpoint').value.trim() || DEFAULT_ENDPOINTS[provider] || '',
      apiKey: apiKey,
      validated: isValid,
      validationError: isValid ? '' : 'API 校验失败，请检查配置'
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

    if (isValid) {
      showToast('保存成功', 'success');
    } else {
      showToast('保存成功，但 API 校验失败', 'warning');
    }
  }

  // 校验 API Key
  async function validateApiKey(provider, apiKey, model) {
    return new Promise((resolve) => {
      // 发送消息到 background 进行校验
      chrome.runtime.sendMessage({
        type: 'VALIDATE_API',
        data: {
          provider: provider,
          apiKey: apiKey,
          model: model
        }
      }, (response) => {
        // 检查运行时错误
        if (chrome.runtime.lastError) {
          console.error('API 校验失败:', chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
        resolve(response?.success || false);
      });
    });
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
    'deepseek': 'https://api.deepseek.com',
    'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'glm': 'https://open.bigmodel.cn/api/paas/v4',
    'moonshot': 'https://api.moonshot.cn/v1',
    'ernie': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    'spark': 'https://spark-api-open.xf-yun.com/v1/chat/completions'
  };

  // 获取修正后的 endpoint（兼容处理错误的 endpoint）
  function getCorrectEndpoint(provider, userEndpoint) {
    // 完整的 endpoint 映射（包含完整路径）
    const endpoints = {
      'openai': 'https://api.openai.com/v1/chat/completions',
      'anthropic': 'https://api.anthropic.com/v1/messages',
      'deepseek': 'https://api.deepseek.com/chat/completions',
      'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      'glm': 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      'moonshot': 'https://api.moonshot.cn/v1/chat/completions',
      'ernie': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/chat/completions_ernie'
    };

    const correctEndpoint = endpoints[provider];
    if (!correctEndpoint) {
      return userEndpoint || '';
    }

    // 如果用户没填或填错了，都使用正确的
    if (!userEndpoint || userEndpoint !== correctEndpoint) {
      return correctEndpoint;
    }
    return userEndpoint;
  }

  // 内置默认模型
  const DEFAULT_MODELS = [
    { name: 'GPT-4', provider: 'openai', model: 'gpt-4o' },
    { name: 'Claude', provider: 'anthropic', model: 'claude-3-opus' },
    { name: 'DeepSeek', provider: 'deepseek', model: 'deepseek-chat' },
    { name: '通义千问', provider: 'qwen', model: 'qwen-plus' },
    { name: 'GLM-5', provider: 'glm', model: 'glm-5' },
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
