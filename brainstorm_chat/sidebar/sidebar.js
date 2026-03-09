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
    documentView: document.getElementById('document-view'),

    // 新 Header 项目管理
    headerProject: document.getElementById('header-project'),
    headerProjectName: document.getElementById('header-project-name'),
    headerDropdown: document.getElementById('header-dropdown'),
    headerDropdownList: document.getElementById('header-dropdown-list'),
    newDiscussionBtn: document.getElementById('new-discussion-btn'),

    // 项目管理 (兼容旧代码)
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
    discussionListContainer: document.getElementById('discussion-list-container'),
    emptyState: document.getElementById('empty-state'),
    completedDivider: document.getElementById('completed-divider'),
    activeDiscussionsSection: document.getElementById('active-discussions-section'),
    completedDiscussionsSection: document.getElementById('completed-discussions-section'),

    // 主界面 - 新输入区
    requirementInput: document.getElementById('requirement-input'),
    inputArea: document.getElementById('input-area'),
    inputExpanded: document.getElementById('input-expanded'),
    modelList: document.getElementById('model-list'),
    modelChips: document.getElementById('model-chips'),
    modeChips: document.getElementById('mode-chips'),
    modelCount: document.getElementById('model-count'),
    modeCount: document.getElementById('mode-count'),
    startBtn: document.getElementById('start-btn'),
    emptyNewDiscussionBtn: document.getElementById('empty-new-discussion-btn'),
    configBtn: document.getElementById('config-btn'),

    // 讨论界面
    backBtn: document.getElementById('back-btn'),
    exportBtn: document.getElementById('export-btn'),
    modelStatus: document.getElementById('model-status'),
    roundIndicator: document.getElementById('round-indicator'),
    discussionMessages: document.getElementById('discussion-messages'),
    discussionDocument: document.getElementById('discussion-document'),
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

    // 主题设置
    themeLight: document.getElementById('theme-light'),
    themeDark: document.getElementById('theme-dark'),
    themeAuto: document.getElementById('theme-auto'),

    // 文档界面
    docBackBtn: document.getElementById('doc-back-btn'),
    docCopyBtn: document.getElementById('doc-copy-btn'),
    docExportBtn: document.getElementById('doc-export-btn'),
    documentContent: document.getElementById('document-content'),

    // 主题切换
    themeToggle: document.getElementById('theme-toggle')
  };

  // 初始化
  async function init() {
    initTheme();
    await loadApiConfigs();
    await StateManager.loadSelectedModels(); // 加载保存的模型选择
    await StateManager.loadHostModel(); // 加载主持人模型
    await StateManager.loadProjects(); // 加载项目
    await StateManager.loadDiscussions(); // 加载讨论列表 (新)
    initHeaderProjectSwitcher(); // 初始化新 Header 项目切换器
    initInputArea(); // 初始化输入区交互
    bindEvents();
    setupMessageListener();
    setupRealtimeUpdates(); // 设置实时更新监听 (新)
    renderModelChips(); // 渲染模型选择芯片 (新)
    renderModeChips(); // 渲染模式选择芯片 (新)
    updateSelectedModels(); // 初始化模型选择状态
    updateSelectedModes(); // 初始化模式选择状态
    updateStartButton();
    renderDashboard(); // 渲染仪表盘 (新)
    restorePanelState(); // 恢复面板状态 (新)
    initThemeSelector(); // 初始化主题选择器 (新)
  }

  // ========== 新 UI 初始化函数 ==========

  // 初始化 Header 项目切换器
  function initHeaderProjectSwitcher() {
    renderHeaderProjectList();
    updateHeaderProjectDisplay();
    bindHeaderProjectEvents();
  }

  function bindHeaderProjectEvents() {
    // 点击 Header 项目名展开/收起下拉
    if (elements.headerProject) {
      elements.headerProject.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.headerProject.classList.toggle('active');
        elements.headerDropdown.classList.toggle('show');
      });
    }

    // 点击其他地方关闭下拉
    document.addEventListener('click', () => {
      if (elements.headerDropdown) {
        elements.headerDropdown.classList.remove('show');
      }
      if (elements.headerProject) {
        elements.headerProject.classList.remove('active');
      }
    });

    // 新建项目按钮
    if (elements.newProjectBtn) {
      elements.newProjectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.projectNameInput.value = '';
        elements.projectModal.classList.add('active');
        elements.projectNameInput.focus();
        elements.headerDropdown.classList.remove('show');
      });
    }

    // 新建讨论按钮
    if (elements.newDiscussionBtn) {
      elements.newDiscussionBtn.addEventListener('click', () => {
        focusInput();
      });
    }

    // 取消项目弹窗
    if (elements.cancelProjectBtn) {
      elements.cancelProjectBtn.addEventListener('click', () => {
        elements.projectModal.classList.remove('active');
      });
    }

    // 提交项目表单
    if (elements.projectForm) {
      elements.projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = elements.projectNameInput.value.trim();
        if (name) {
          const project = await StateManager.addProject(name);
          await StateManager.switchProject(project.id);
          renderHeaderProjectList();
          updateHeaderProjectDisplay();
          elements.projectModal.classList.remove('active');
        }
      });
    }

    // 删除项目按钮
    if (elements.deleteProjectBtn) {
      elements.deleteProjectBtn.addEventListener('click', async () => {
        const currentProject = StateManager.getCurrentProject();
        if (currentProject && confirm(`确定要删除项目"${currentProject.name}"吗？该项目的所有讨论将被删除。`)) {
          await StateManager.deleteProject(currentProject.id);
          renderHeaderProjectList();
          updateHeaderProjectDisplay();
        }
      });
    }
  }

  function renderHeaderProjectList() {
    if (!elements.headerDropdownList) return;

    const projects = StateManager.state.projects;
    const currentId = StateManager.state.currentProjectId;

    elements.headerDropdownList.innerHTML = projects.map(project => `
      <div class="project-item ${project.id === currentId ? 'active' : ''}" data-id="${project.id}">
        <span class="project-item-name">${escapeHtml(project.name)}</span>
        <span class="project-item-count">${project.discussions.length}次</span>
      </div>
    `).join('');

    // 绑定点击项目切换
    elements.headerDropdownList.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', async () => {
        const projectId = item.dataset.id;
        await StateManager.switchProject(projectId);
        renderHeaderProjectList();
        updateHeaderProjectDisplay();
        elements.headerDropdown.classList.remove('show');
        renderDashboard(); // 切换项目后刷新仪表盘
      });
    });
  }

  function updateHeaderProjectDisplay() {
    if (!elements.headerProjectName) return;

    const project = StateManager.getCurrentProject();
    if (project) {
      elements.headerProjectName.textContent = project.name;
    }
  }

  // 初始化输入区交互
  function initInputArea() {
    // 空状态的"新建讨论"按钮
    if (elements.emptyNewDiscussionBtn) {
      elements.emptyNewDiscussionBtn.addEventListener('click', () => {
        showInputArea();
        if (elements.requirementInput) {
          elements.requirementInput.focus();
        }
      });
    }

    // Header 的"新建讨论"按钮
    if (elements.newDiscussionBtn) {
      elements.newDiscussionBtn.addEventListener('click', () => {
        showInputArea();
        if (elements.requirementInput) {
          elements.requirementInput.focus();
        }
      });
    }

    if (!elements.requirementInput) return;

    // 输入框获得焦点时展开
    elements.requirementInput.addEventListener('focus', () => {
      expandInputArea();
    });

    // 输入内容变化时更新按钮状态
    elements.requirementInput.addEventListener('input', () => {
      updateStartButton();
      // 如果有内容，自动展开
      if (elements.requirementInput.value.trim().length > 0) {
        expandInputArea();
      }
    });
  }

  // 显示输入区
  function showInputArea() {
    if (elements.inputArea) {
      elements.inputArea.style.display = 'block';
    }
  }

  // 隐藏输入区
  function hideInputArea() {
    if (elements.inputArea) {
      elements.inputArea.style.display = 'none';
    }
    collapseInputArea();
  }

  function expandInputArea() {
    if (elements.inputExpanded) {
      elements.inputExpanded.style.display = 'block';
    }
  }

  function collapseInputArea() {
    if (elements.inputExpanded) {
      elements.inputExpanded.style.display = 'none';
    }
  }

  function focusInput() {
    if (elements.requirementInput) {
      elements.requirementInput.focus();
    }
  }

  // 渲染模式选择芯片 (新)
  function renderModeChips() {
    if (!elements.modeChips) return;

    const modeChips = elements.modeChips.querySelectorAll('.mode-chip');
    modeChips.forEach(chip => {
      const checkbox = chip.querySelector('input');
      if (checkbox) {
        // 设置初始状态
        if (checkbox.checked) {
          chip.classList.add('active');
        }

        chip.addEventListener('click', (e) => {
          // 阻止 label 的默认行为（自动切换 checkbox）
          // 因为我们会手动处理
          e.preventDefault();

          // 手动切换 checkbox 状态
          checkbox.checked = !checkbox.checked;
          chip.classList.toggle('active', checkbox.checked);
          updateSelectedModes();
          updateModeOrderDisplay();
        });
      }
    });

    // 初始化显示
    updateModeOrderDisplay();
  }

  // 更新模式顺序显示
  function updateModeOrderDisplay() {
    if (!elements.modeChips) return;

    const selectedModes = [];
    const modeNames = {
      'round-table': '圆桌会议',
      'brainstorm': '头脑风暴',
      'debate': '辩论评审'
    };

    // 按照选择的顺序收集模式
    elements.modeChips.querySelectorAll('.mode-chip').forEach(chip => {
      const checkbox = chip.querySelector('input');
      const orderSpan = chip.querySelector('.mode-order');

      if (checkbox && checkbox.checked) {
        selectedModes.push({
          mode: checkbox.value,
          name: chip.querySelector('.mode-name')?.textContent || modeNames[checkbox.value] || checkbox.value
        });

        // 更新顺序数字
        if (orderSpan) {
          orderSpan.textContent = selectedModes.length;
        }
      } else {
        // 未选中的重置顺序
        if (orderSpan) {
          const originalOrder = chip.dataset.order || '';
          orderSpan.textContent = originalOrder;
        }
      }
    });

    // 更新预览区域
    const previewModes = document.getElementById('preview-modes');
    if (previewModes) {
      if (selectedModes.length > 0) {
        previewModes.innerHTML = selectedModes.map(m => m.name).join('<span class="mode-arrow">→</span>');
      } else {
        previewModes.textContent = '请选择至少一个模式';
      }
    }
  }

  // 渲染模型选择芯片 (新)
  function renderModelChips() {
    if (!elements.modelChips) return;

    const enabledModels = state.apiConfigs.filter(c => c.validated);
    const disabledModels = state.apiConfigs.filter(c => !c.validated);
    const savedSelection = state.selectedModels || [];
    const hostModelId = state.hostModelId;

    // 获取初始选择状态
    const getInitialSelection = (configId) => {
      if (savedSelection.includes(configId)) return true;
      if (savedSelection.length === 0 && enabledModels.find(m => m.id === configId)) return true;
      return false;
    };

    // 渲染已启用的模型
    let html = enabledModels.map(config => {
      const isSelected = getInitialSelection(config.id);
      const isHost = hostModelId === config.id;
      return `
        <div class="model-chip ${isSelected ? 'selected' : ''} ${isHost ? 'is-host' : ''}" data-id="${config.id}">
          <span class="model-chip-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span class="model-chip-name">${escapeHtml(config.name)}</span>
          ${isHost ? `
            <span class="host-indicator" title="点击取消主持人">
              <svg class="host-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              <span class="host-label">主持</span>
            </span>
          ` : ''}
          ${isSelected && !isHost ? `
            <button class="set-host-btn" title="设为讨论主持人">
              <svg class="host-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              <span class="host-label">设为主持</span>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    // 渲染未启用的模型
    html += disabledModels.map(config => `
      <div class="model-chip disabled" data-id="${config.id}" title="该模型未启用，请在设置中启用">
        <span class="model-chip-name">${escapeHtml(config.name)}</span>
      </div>
    `).join('');

    elements.modelChips.innerHTML = html;

    // 绑定点击事件
    elements.modelChips.querySelectorAll('.model-chip:not(.disabled)').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        updateSelectedModelsFromChips();
        StateManager.saveSelectedModels();
        renderModelChips(); // 重新渲染以更新主持人按钮
      });
    });

    // 绑定主持人切换事件
    elements.modelChips.querySelectorAll('.set-host-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modelId = btn.closest('.model-chip').dataset.id;
        StateManager.setHostModel(modelId);
        renderModelChips();
      });
    });

    // 绑定主持人取消事件 (点击主持人标记取消主持人)
    elements.modelChips.querySelectorAll('.host-indicator').forEach(indicator => {
      indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        StateManager.setHostModel(null);
        renderModelChips();
      });
    });

    // 同步状态
    updateSelectedModelsFromChips();
  }

  // 从芯片更新已选模型
  function updateSelectedModelsFromChips() {
    if (!elements.modelChips) return;

    state.selectedModels = Array.from(elements.modelChips.querySelectorAll('.model-chip.selected'))
      .map(chip => chip.dataset.id);
    updateStartButton();
  }

  // 初始化主题选择器
  function initThemeSelector() {
    const themeOptions = document.querySelectorAll('.theme-option');
    const savedTheme = localStorage.getItem('theme') || 'light';

    // 设置当前主题
    setTheme(savedTheme);
    updateThemeSelector(savedTheme);

    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        setTheme(theme);
        updateThemeSelector(theme);
      });
    });
  }

  function updateThemeSelector(theme) {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.classList.toggle('active', option.dataset.theme === theme);
    });
  }

  // ========== 新功能：仪表盘渲染 ==========

  function renderDashboard() {
    renderActiveDiscussionsV2();
    renderCompletedDiscussionsV2();
    updateEmptyState();
  }

  // 更新空状态显示
  function updateEmptyState() {
    const activeDiscussions = StateManager.getActiveDiscussions();
    const completedDiscussions = StateManager.getCompletedDiscussions();
    const hasDiscussions = activeDiscussions.length > 0 || completedDiscussions.length > 0;

    // 空状态显示
    if (elements.emptyState) {
      elements.emptyState.style.display = hasDiscussions ? 'none' : 'flex';
    }

    // 输入区：有讨论时显示，无讨论时隐藏
    if (elements.inputArea) {
      elements.inputArea.style.display = hasDiscussions ? 'block' : 'none';
    }

    // 已完成分隔线
    if (elements.completedDivider) {
      elements.completedDivider.style.display = completedDiscussions.length > 0 ? 'flex' : 'none';
    }
  }

  // 渲染活跃讨论 (新版本)
  function renderActiveDiscussionsV2() {
    const container = elements.activeDiscussionsSection;
    if (!container) return;

    const activeDiscussions = StateManager.getActiveDiscussions();

    console.log('[Sidebar] renderActiveDiscussionsV2', {
      activeDiscussionsCount: activeDiscussions.length,
      activeDiscussionId: StateManager.state.activeDiscussionId,
      discussions: activeDiscussions.map(d => ({
        id: d.id,
        title: d.title,
        status: d.status,
        currentRound: d.currentRound,
        modelsCount: d.models?.length,
        models: d.models?.map(m => ({ modelId: m.modelId, name: m.name, status: m.status }))
      }))
    });

    if (activeDiscussions.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = activeDiscussions.map(discussion => {
      const statusClass = discussion.status || 'running';
      const statusText = getStatusText(discussion.status);
      const timeText = formatRelativeTime(discussion.updatedAt || discussion.createdAt);

      return `
        <div class="discussion-item-v2 ${discussion.id === StateManager.state.activeDiscussionId ? 'active' : ''}"
             data-id="${discussion.id}">
          <div class="item-status">
            <span class="status-dot ${statusClass}"></span>
          </div>
          <div class="item-content">
            <div class="item-title">${escapeHtml(discussion.title || '未命名讨论')}</div>
            <div class="item-meta">${statusText} · 第${discussion.currentRound || 1}/${discussion.totalRounds || discussion.modes?.length || 1}轮</div>
          </div>
          <div class="item-time">${timeText}</div>
        </div>
      `;
    }).join('');

    // 绑定点击事件
    container.querySelectorAll('.discussion-item-v2').forEach(item => {
      item.addEventListener('click', () => {
        const discussionId = item.dataset.id;
        StateManager.setActiveDiscussion(discussionId);
        expandBottomPanel();
        // 更新选中状态
        container.querySelectorAll('.discussion-item-v2').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  // 渲染已完成讨论 (新版本)
  function renderCompletedDiscussionsV2() {
    const container = elements.completedDiscussionsSection;
    if (!container) return;

    const completedDiscussions = StateManager.getCompletedDiscussions().slice(0, 10);

    if (completedDiscussions.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = completedDiscussions.map(discussion => {
      const timeText = formatRelativeTime(discussion.updatedAt || discussion.createdAt);

      return `
        <div class="discussion-item-v2"
             data-id="${discussion.id}">
          <div class="item-status">
            <span class="status-dot completed"></span>
          </div>
          <div class="item-content">
            <div class="item-title">${escapeHtml(discussion.title || '未命名讨论')}</div>
            <div class="item-meta">已完成 · ${discussion.totalRounds || discussion.modes?.length || 1}轮</div>
          </div>
          <div class="item-time">${timeText}</div>
        </div>
      `;
    }).join('');

    // 绑定点击事件
    container.querySelectorAll('.discussion-item-v2').forEach(item => {
      item.addEventListener('click', async () => {
        const discussionId = item.dataset.id;
        // 查看已完成的讨论文档
        const discussion = StateManager.state.discussions.find(d => d.id === discussionId);
        if (discussion && discussion.finalDoc) {
          state.currentDiscussion = discussion;
          elements.documentContent.innerHTML = marked.parse(discussion.finalDoc);
          switchView('document');
        } else {
          showToast('该讨论暂无文档', 'info');
        }
      });
    });
  }

  // 获取状态文本
  function getStatusText(status) {
    const texts = {
      running: '进行中',
      paused: '已暂停',
      completed: '已完成',
      error: '出错',
      cancelled: '已取消'
    };
    return texts[status] || '进行中';
  }

  // 格式化相对时间
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

  // 渲染活跃讨论 (旧版本 - 兼容)
  function renderActiveDiscussions() {
    const container = document.getElementById('active-discussions-list');
    if (!container) return;

    const activeDiscussions = StateManager.getActiveDiscussions();

    if (activeDiscussions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无进行中的讨论</div>
          <div class="empty-subtext">输入需求开始一个新的讨论</div>
        </div>
      `;
      return;
    }

    container.innerHTML = activeDiscussions.map(discussion => `
      <discussion-card discussion-id="${discussion.id}"></discussion-card>
    `).join('');

    // 绑定卡片事件
    container.querySelectorAll('discussion-card').forEach(card => {
      card.addEventListener('discussion-action', handleDiscussionAction);
      card.addEventListener('discussion-select', (e) => {
        StateManager.setActiveDiscussion(e.detail.discussionId);
        expandBottomPanel();
      });
    });
  }

  // 渲染已完成讨论 (旧版本 - 兼容)
  function renderCompletedDiscussions() {
    const container = document.getElementById('completed-discussions-list');
    if (!container) return;

    const completedDiscussions = StateManager.getCompletedDiscussions().slice(0, 10);

    if (completedDiscussions.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无已完成讨论</div>';
      return;
    }

    container.innerHTML = completedDiscussions.map(discussion => `
      <discussion-card discussion-id="${discussion.id}"></discussion-card>
    `).join('');

    container.querySelectorAll('discussion-card').forEach(card => {
      card.addEventListener('discussion-action', handleDiscussionAction);
      card.addEventListener('discussion-select', (e) => {
        StateManager.setActiveDiscussion(e.detail.discussionId);
        expandBottomPanel();
      });
    });
  }

  // 处理讨论卡片操作
  async function handleDiscussionAction(e) {
    const { action, discussionId } = e.detail;

    switch (action) {
      case 'pause': {
        const response = await chrome.runtime.sendMessage({
          type: 'PAUSE_DISCUSSION',
          data: { discussionId }
        });
        if (response?.type === 'DISCUSSION_NOT_RUNNING') {
          showToast(response.reason || '讨论已完成', 'info');
          // 刷新 UI 状态
          StateManager.updateDiscussionProgress(discussionId, { status: 'completed' });
          renderDashboard();
        }
        break;
      }

      case 'resume': {
        const response = await chrome.runtime.sendMessage({
          type: 'RESUME_DISCUSSION',
          data: { discussionId }
        });
        if (response?.type === 'DISCUSSION_NOT_RUNNING') {
          showToast(response.reason || '讨论已完成', 'info');
          StateManager.updateDiscussionProgress(discussionId, { status: 'completed' });
          renderDashboard();
        }
        break;
      }

      case 'cancel':
        if (confirm('确定要取消这个讨论吗？')) {
          await chrome.runtime.sendMessage({
            type: 'CANCEL_DISCUSSION',
            data: { discussionId }
          });
          StateManager.updateDiscussionProgress(discussionId, { status: 'cancelled' });
          renderDashboard();
        }
        break;

      case 'view':
        StateManager.setActiveDiscussion(discussionId);
        expandBottomPanel();
        break;

      case 'export':
        await exportDiscussionDocument(discussionId);
        break;

      case 'restart':
        const discussion = StateManager.state.discussions.find(d => d.id === discussionId);
        if (discussion) {
          elements.requirementInput.value = discussion.requirement;
          // 切换到主视图
          switchView('main');
        }
        break;

      case 'retry':
        // 重新运行出错的讨论
        showToast('重试功能开发中...', 'info');
        break;
    }
  }

  // ========== 底部面板控制 ==========

  function expandBottomPanel() {
    StateManager.setPanelState('expanded');
    const panel = document.querySelector('bottom-panel');
    if (panel) panel.setState('expanded');
    updateBottomPanelContent();
  }

  function collapseBottomPanel() {
    StateManager.setPanelState('collapsed');
    const panel = document.querySelector('bottom-panel');
    if (panel) panel.setState('collapsed');
  }

  function toggleBottomPanel() {
    const currentState = StateManager.state.panelState;
    const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed';

    StateManager.setPanelState(newState);
    const panel = document.querySelector('bottom-panel');
    if (panel) panel.setState(newState);

    if (newState === 'expanded') {
      updateBottomPanelContent();
    }
  }

  function updateBottomPanelContent() {
    const panel = document.querySelector('bottom-panel');
    const discussion = StateManager.getActiveDiscussion();

    console.log('[Sidebar] updateBottomPanelContent', {
      hasPanel: !!panel,
      hasDiscussion: !!discussion,
      discussionId: discussion?.id,
      currentRound: discussion?.currentRound,
      totalRounds: discussion?.totalRounds,
      progress: discussion?.progress,
      modelsCount: discussion?.models?.length,
      models: discussion?.models?.map(m => ({ modelId: m.modelId, name: m.name, status: m.status, progress: m.progress }))
    });

    if (panel && discussion) {
      panel.setDiscussionContent(discussion);
    }
  }

  function restorePanelState() {
    const panel = document.querySelector('bottom-panel');
    if (!panel) return;

    // 获取活跃讨论
    const activeDiscussions = StateManager.getActiveDiscussions();
    const hasActiveDiscussion = activeDiscussions.length > 0 && StateManager.state.activeDiscussionId;

    // 只在有活跃讨论时恢复保存的状态，否则默认收缩
    const panelState = hasActiveDiscussion ? (StateManager.state.panelState || 'collapsed') : 'collapsed';

    panel.setState(panelState);
  }

  // ========== 实时更新监听 ==========

  function setupRealtimeUpdates() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { type, discussionId } = message;

      switch (type) {
        case 'DISCUSSION_STARTED':
          showToast('讨论已启动', 'success');
          renderActiveDiscussions();
          expandBottomPanel();
          break;

        case 'MODEL_STATUS_UPDATE':
          StateManager.updateModelStatus(
            discussionId,
            message.modelId,
            { status: message.status, progress: message.progress, response: message.response, error: message.error, isHost: message.isHost }
          );

          // 更新轮次执行事件到时间线（合并显示，避免混乱）
          const discussion = StateManager.state.discussions.find(d => d.id === discussionId);
          if (discussion) {
            if (!discussion.timelineEvents) {
              discussion.timelineEvents = [];
            }

            // 获取当前轮次
            const currentRound = discussion.currentRound || 1;
            const eventKey = `round-exec-${currentRound}`;

            // 查找是否已有当前轮次的执行事件
            let roundEvent = discussion.timelineEvents.find(e => e.eventKey === eventKey);

            // 获取模型信息
            const model = discussion.models?.find(m => m.modelId === message.modelId);
            const modelName = model?.name || message.modelId;

            if (!roundEvent) {
              // 创建新的轮次执行事件
              roundEvent = {
                type: 'round-execution',
                eventKey: eventKey,
                timestamp: new Date().toISOString(),
                round: currentRound,
                mode: discussion.currentMode || discussion.modes?.[discussion.currentModeIndex || 0] || 'brainstorm',
                models: []
              };
              discussion.timelineEvents.push(roundEvent);
            }

            // 更新或添加模型状态
            const existingModelIndex = roundEvent.models.findIndex(m => m.modelId === message.modelId);
            const modelStatus = {
              modelId: message.modelId,
              modelName: modelName,
              status: message.status, // running, completed, error, pending
              isHost: message.isHost || false,
              timestamp: new Date().toISOString()
            };

            console.log('[Sidebar] MODEL_STATUS_UPDATE 更新模型状态:', {
              modelId: message.modelId,
              modelName: modelName,
              status: message.status,
              isHost: message.isHost,
              currentRound: currentRound,
              eventKey: eventKey,
              existingModelIndex: existingModelIndex,
              roundEventModelsCount: roundEvent.models.length,
              roundEventModels: roundEvent.models.map(m => ({ modelId: m.modelId, modelName: m.modelName, status: m.status }))
            });

            if (existingModelIndex >= 0) {
              roundEvent.models[existingModelIndex] = modelStatus;
              console.log('[Sidebar] 已更新现有模型状态:', { modelId: message.modelId, status: message.status });
            } else {
              roundEvent.models.push(modelStatus);
              console.log('[Sidebar] 已添加新模型状态:', { modelId: message.modelId, status: message.status });
            }
          }

          // 如果当前正在查看这个讨论，更新面板
          if (StateManager.state.activeDiscussionId === discussionId) {
            updateBottomPanelContent();
          }
          break;

        case 'ROUND_COMPLETE':
          // 更新讨论的消息和轮次
          const roundDiscussion = StateManager.state.discussions.find(d => d.id === discussionId);
          if (roundDiscussion) {
            // 添加消息
            if (!roundDiscussion.messages) {
              roundDiscussion.messages = [];
            }
            roundDiscussion.messages.push({
              round: message.round,
              responses: message.results
            });
            // 不在这里更新 currentRound，下一轮开始时会通过 ROUND_START 更新
            roundDiscussion.updatedAt = new Date().toISOString();

            // 更新所有模型状态为 completed
            if (roundDiscussion.models) {
              roundDiscussion.models.forEach(model => {
                model.status = 'completed';
                model.progress = 100;
              });
            }

            console.log('[Sidebar] ROUND_COMPLETE:', {
              discussionId,
              completedRound: message.round
            });
            // 保存并通知
            StateManager.saveDiscussions();
            StateManager.notify('discussions', StateManager.state.discussions);
          }
          // 使用 requestAnimationFrame 确保 DOM 更新
          requestAnimationFrame(() => {
            renderDashboard();
            updateBottomPanelContent();
          });
          break;

        case 'HOST_SUMMARY':
          // 主持人汇总
          const hostDiscussion = StateManager.state.discussions.find(d => d.id === discussionId);
          if (hostDiscussion && hostDiscussion.messages && hostDiscussion.messages.length > 0) {
            // 将主持人汇总添加到最后一条消息
            const lastMessage = hostDiscussion.messages[hostDiscussion.messages.length - 1];
            lastMessage.hostSummary = message.summary;

            // 更新主持人模型状态为 completed
            if (hostDiscussion.models && message.summary?.model) {
              const hostModel = hostDiscussion.models.find(m =>
                m.name === message.summary.model || m.modelId === message.summary.model
              );
              if (hostModel) {
                hostModel.status = 'completed';
                hostModel.progress = 100;
              }
            }

            console.log('[Sidebar] HOST_SUMMARY - 主持人汇总完成:', {
              discussionId,
              model: message.summary?.model,
              stage: message.summary?.stage
            });
            StateManager.saveDiscussions();
            StateManager.notify('discussions', StateManager.state.discussions);
          }
          // 使用 requestAnimationFrame 确保 DOM 更新
          requestAnimationFrame(() => {
            renderDashboard();
            updateBottomPanelContent();
          });
          showToast('主持人汇总完成', 'success');
          break;

        case 'ROUND_START':
          // 轮次开始 - 更新时间线
          const roundStartDiscussion = StateManager.state.discussions.find(d => d.id === discussionId);
          console.log('[Sidebar] ROUND_START', {
            discussionId,
            round: message.round,
            mode: message.mode,
            discussionTotalRounds: roundStartDiscussion?.totalRounds,
            discussionModes: roundStartDiscussion?.modes,
            discussionModesLength: roundStartDiscussion?.modes?.length
          });
          if (roundStartDiscussion) {
            // 添加时间线事件
            if (!roundStartDiscussion.timelineEvents) {
              roundStartDiscussion.timelineEvents = [];
            }
            roundStartDiscussion.timelineEvents.push({
              type: 'round-start',
              timestamp: new Date().toISOString(),
              round: message.round,
              totalRounds: roundStartDiscussion.totalRounds, // 添加总轮次数
              mode: message.mode
            });
            // 更新当前轮次
            roundStartDiscussion.currentRound = message.round;

            // 重置所有模型状态为 pending
            if (roundStartDiscussion.models) {
              roundStartDiscussion.models.forEach(model => {
                model.status = 'pending';
                model.progress = 0;
              });
            }

            StateManager.saveDiscussions();
            if (StateManager.state.activeDiscussionId === discussionId) {
              updateBottomPanelContent();
            }
          }
          break;

        case 'MODE_SWITCH':
          // 模式切换 - 更新时间线
          console.log('[Sidebar] MODE_SWITCH', {
            discussionId,
            currentMode: message.currentMode,
            currentModeIndex: message.currentModeIndex
          });
          const modeSwitchDiscussion = StateManager.state.discussions.find(d => d.id === discussionId);
          if (modeSwitchDiscussion) {
            // 添加时间线事件
            if (!modeSwitchDiscussion.timelineEvents) {
              modeSwitchDiscussion.timelineEvents = [];
            }
            // 先添加上一模式结束事件
            if (modeSwitchDiscussion.timelineEvents.length > 0) {
              modeSwitchDiscussion.timelineEvents.push({
                type: 'mode-end',
                timestamp: new Date().toISOString(),
                mode: modeSwitchDiscussion.modes[message.currentModeIndex - 1]
              });
            }
            // 添加新模式开始事件
            modeSwitchDiscussion.timelineEvents.push({
              type: 'mode-start',
              timestamp: new Date().toISOString(),
              mode: message.currentMode,
              modeIndex: message.currentModeIndex,
              totalModes: message.totalModes
            });
            // 更新当前模式索引
            modeSwitchDiscussion.currentModeIndex = message.currentModeIndex;
            StateManager.saveDiscussions();
            if (StateManager.state.activeDiscussionId === discussionId) {
              updateBottomPanelContent();
            }
          }
          break;

        case 'DISCUSSION_COMPLETED': {
          StateManager.updateDiscussionProgress(discussionId, { status: 'completed', progress: 100 });
          // 添加讨论结束时间线事件
          const completedDiscussion = StateManager.state.discussions.find(d => d.id === discussionId);
          if (completedDiscussion) {
            if (!completedDiscussion.timelineEvents) {
              completedDiscussion.timelineEvents = [];
            }
            completedDiscussion.timelineEvents.push({
              type: 'discussion-end',
              timestamp: new Date().toISOString(),
              status: 'completed'
            });

            // 自动生成文档（后台异步进行）
            generateDocumentAsync(completedDiscussion);

            StateManager.saveDiscussions();
            // 如果当前正在查看这个讨论，更新面板
            if (StateManager.state.activeDiscussionId === discussionId) {
              updateBottomPanelContent();
            }
          }
          renderDashboard();
          showToast('讨论完成！文档生成中...', 'success');
          break;
        }

        case 'DISCUSSION_ERROR': {
          StateManager.updateDiscussionProgress(discussionId, { status: 'error', error: message.error });
          // 添加讨论结束时间线事件
          const errorDiscussion = StateManager.state.discussions.find(d => d.id === discussionId);
          if (errorDiscussion) {
            if (!errorDiscussion.timelineEvents) {
              errorDiscussion.timelineEvents = [];
            }
            errorDiscussion.timelineEvents.push({
              type: 'discussion-end',
              timestamp: new Date().toISOString(),
              status: 'error',
              error: message.error
            });
            StateManager.saveDiscussions();
            // 如果当前正在查看这个讨论，更新面板
            if (StateManager.state.activeDiscussionId === discussionId) {
              updateBottomPanelContent();
            }
          }
          renderDashboard();
          showToast(`讨论出错: ${message.error}`, 'error');
          break;
        }

        case 'DISCUSSION_PAUSED':
          StateManager.updateDiscussionProgress(discussionId, { status: 'paused' });
          renderDashboard();
          break;

        case 'DISCUSSION_RESUMED':
          StateManager.updateDiscussionProgress(discussionId, { status: 'running' });
          renderDashboard();
          break;

        case 'DISCUSSION_CANCELLED':
          StateManager.updateDiscussionProgress(discussionId, { status: 'cancelled' });
          renderDashboard();
          break;
      }
    });
  }

  // 异步生成文档（后台进行，不阻塞 UI）
  async function generateDocumentAsync(discussion) {
    if (!discussion || discussion.finalDoc) return; // 已有文档则跳过

    const messages = discussion.messages.flatMap(m => m.responses.map(r => ({
      model: r.model,
      content: r.content
    })));

    if (!messages.length) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_DOCUMENT',
        data: {
          messages,
          requirement: discussion.requirement
        }
      });

      if (response?.data?.document) {
        // 更新讨论对象的 finalDoc
        discussion.finalDoc = response.data.document;
        StateManager.saveDiscussions();
        console.log('[Export] 文档自动生成完成');
      }
    } catch (error) {
      console.error('[Export] 自动生成文档失败:', error);
    }
  }

  // 导出讨论文档
  async function exportDiscussionDocument(discussionId) {
    const discussion = StateManager.state.discussions.find(d => d.id === discussionId);
    if (!discussion) return;

    const messages = discussion.messages.flatMap(m => m.responses.map(r => ({
      model: r.model,
      content: r.content
    })));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_DOCUMENT',
        data: {
          messages,
          requirement: discussion.requirement
        }
      });

      if (response?.data?.document) {
        // 显示文档预览
        state.currentDiscussion = {
          ...discussion,
          finalDoc: response.data.document
        };
        elements.documentContent.innerHTML = marked.parse(response.data.document);
        switchView('document');
      }
    } catch (error) {
      showToast('生成文档失败', 'error');
    }
  }

  // 兼容旧代码
  // 恢复进行中的讨论
  function restoreDiscussionIfNeeded() {
    // 已由新的状态系统处理
  }

  // 保存进行中的讨论
  async function saveActiveDiscussion() {
    // 已由 StateManager 自动处理
  }

  // 清除进行中的讨论
  async function clearActiveDiscussion() {
    // 已由 StateManager 自动处理
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
    if (state.isDiscussing) {
      // 有进行中的讨论，重置状态并显示提示
      StateManager.clearCurrentDiscussion();
      renderDiscussionList();
      showToast('检测到未完成的讨论，已重置状态', 'info');
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

    // 讨论模式（多选）- 兼容旧版 radio-card
    document.querySelectorAll('.radio-card input[name="mode"]').forEach(checkbox => {
      // 添加初始选中状态
      if (checkbox.checked) {
        const parent = checkbox.closest('.radio-card');
        if (parent) parent.classList.add('active');
      }

      checkbox.addEventListener('change', () => {
        const card = checkbox.closest('.radio-card');
        if (card) {
          card.classList.toggle('active', checkbox.checked);
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

    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        // 切换按钮状态
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 切换内容显示
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`discussion-${tabName}`).classList.add('active');
      });
    });

    // 配置界面
    elements.configBackBtn.addEventListener('click', () => switchView('main'));
    elements.addModelBtn.addEventListener('click', () => openConfigModal());
    elements.cancelConfigBtn.addEventListener('click', closeConfigModal);
    elements.configForm.addEventListener('submit', saveConfig);

    // 文档界面
    elements.docBackBtn.addEventListener('click', () => switchView('main'));
    elements.docCopyBtn.addEventListener('click', copyDocument);
    elements.docExportBtn.addEventListener('click', exportDocument);

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
        } else if (elements.projectModal && elements.projectModal.classList.contains('active')) {
          elements.projectModal.classList.remove('active');
        } else if (state.currentView === 'discussion') {
          elements.backBtn.click();
        } else if (state.currentView === 'config' || state.currentView === 'document') {
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
        // 如果已有文档，显示在标签页中
        if (state.currentDiscussion?.finalDoc) {
          elements.discussionDocument.innerHTML = marked.parse(state.currentDiscussion.finalDoc);
        }
        break;
      case 'config':
        elements.configView.classList.add('active');
        renderConfigList();
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

        console.log('[Sidebar] loadApiConfigs - 加载的配置数:', state.apiConfigs.length);
        state.apiConfigs.forEach((config, index) => {
          console.log(`[Sidebar] 配置 ${index}:`, {
            id: config.id,
            name: config.name,
            provider: config.provider,
            hasApiKey: !!config.apiKey,
            validated: config.validated
          });
        });

        // 迁移逻辑：将 enabled 转换为 validated
        let needsSave = false;
        state.apiConfigs.forEach(config => {
          // 确保有 id 字段
          if (!config.id) {
            config.id = generateId();
            console.log('[Sidebar] 为配置添加 ID:', { name: config.name, newId: config.id });
            needsSave = true;
          }
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

  // 渲染模型列表 - 芯片式设计 (兼容旧版)
  function renderModelList() {
    // 如果有新的模型芯片容器，使用新版本
    if (elements.modelChips) {
      renderModelChips();
      return;
    }

    // 空状态：没有配置任何模型
    if (state.apiConfigs.length === 0) {
      if (elements.modelList) {
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
      }

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

    if (elements.modelList) {
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
    }

    // 同步状态
    updateSelectedModels();
  }

  // 更新已选模型
  function updateSelectedModels() {
    // 优先从新的芯片容器获取
    if (elements.modelChips) {
      state.selectedModels = Array.from(elements.modelChips.querySelectorAll('.model-chip.selected'))
        .map(chip => chip.dataset.id);
    } else if (elements.modelList) {
      // 兼容旧版
      state.selectedModels = Array.from(elements.modelList.querySelectorAll('.model-chip.selected'))
        .map(chip => chip.dataset.id);
    }

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
    // 按照芯片在 DOM 中的顺序收集选中的模式
    // 这样可以保证顺序的一致性
    const modeChipsContainer = elements.modeChips || document.querySelector('.mode-chips');
    if (modeChipsContainer) {
      state.discussionModes = [];
      modeChipsContainer.querySelectorAll('.mode-chip').forEach(chip => {
        const checkbox = chip.querySelector('input');
        if (checkbox && checkbox.checked) {
          state.discussionModes.push(checkbox.value);
        }
      });
    } else {
      // 兼容旧版
      state.discussionModes = Array.from(document.querySelectorAll('input[name="mode"]:checked'))
        .map(input => input.value);
    }

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

  // 更新模式顺序显示
  function updateModeOrderDisplay() {
    if (!elements.modeChips) return;

    const selectedModes = [];
    const modeNames = {
      'round-table': '圆桌会议',
      'brainstorm': '头脑风暴',
      'debate': '辩论评审'
    };

    // 按照芯片在 DOM 中的顺序收集选中的模式
    elements.modeChips.querySelectorAll('.mode-chip').forEach(chip => {
      const checkbox = chip.querySelector('input');
      const orderSpan = chip.querySelector('.mode-order');

      if (checkbox && checkbox.checked) {
        selectedModes.push({
          mode: checkbox.value,
          name: chip.querySelector('.mode-name')?.textContent || modeNames[checkbox.value] || checkbox.value
        });

        // 更新顺序数字
        if (orderSpan) {
          orderSpan.textContent = selectedModes.length;
        }
      } else {
        // 未选中的重置顺序为原始位置
        if (orderSpan) {
          const chipIndex = Array.from(elements.modeChips.querySelectorAll('.mode-chip')).indexOf(chip);
          orderSpan.textContent = chipIndex + 1;
        }
      }
    });

    // 更新预览区域
    const previewModes = document.getElementById('preview-modes');
    if (previewModes) {
      if (selectedModes.length > 0) {
        previewModes.innerHTML = selectedModes.map(m => m.name).join('<span class="mode-arrow">→</span>');
      } else {
        previewModes.textContent = '请选择至少一个模式';
      }
    }
  }

  // 更新开始按钮状态
  function updateStartButton() {
    const hasRequirement = elements.requirementInput && elements.requirementInput.value.trim().length > 0;
    const hasSelectedModels = state.selectedModels.length > 0;
    const hasSelectedModes = state.discussionModes.length > 0;

    const canStart = hasRequirement && hasSelectedModels && hasSelectedModes;

    if (elements.startBtn) {
      elements.startBtn.disabled = !canStart;
    }
  }

  // 开始讨论
  async function startDiscussion() {
    console.log('[Sidebar] startDiscussion 被调用');

    const requirement = elements.requirementInput ? elements.requirementInput.value.trim() : '';
    console.log('[Sidebar] 需求:', requirement?.substring(0, 50));
    console.log('[Sidebar] 选中的模型:', state.selectedModels);
    console.log('[Sidebar] 选中的模式:', state.discussionModes);

    if (!requirement || state.selectedModels.length === 0 || state.discussionModes.length === 0) {
      console.log('[Sidebar] 条件不满足，返回');
      return;
    }

    // 检查并发限制
    if (!StateManager.canStartNewDiscussion()) {
      showToast(`最多同时进行 ${StateManager.state.maxConcurrentDiscussions} 个讨论，请先等待或暂停其他讨论`, 'warning');
      return;
    }

    // 获取选中的模型配置
    const selectedConfigs = state.selectedModels
      .map(id => state.apiConfigs.find(c => c.id === id))
      .filter(Boolean);

    // 获取主持人配置
    const hostConfig = state.hostModelId
      ? selectedConfigs.find(c => c.id === state.hostModelId)
      : null;

    console.log('[Sidebar] selectedConfigs:', selectedConfigs.map(c => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      hasApiKey: !!c.apiKey,
      idType: typeof c.id
    })));

    if (selectedConfigs.length === 0) {
      showToast('请先配置并选择模型', 'error');
      return;
    }

    // 创建新讨论 - 支持多模式
    const discussion = StateManager.createDiscussion(
      requirement,
      selectedConfigs,
      state.discussionModes // 传递所有选中的模式数组
    );

    // 添加到讨论列表
    await StateManager.addDiscussion(discussion);

    // 清空输入框并折叠
    if (elements.requirementInput) {
      elements.requirementInput.value = '';
    }
    collapseInputArea();
    updateStartButton();

    // 渲染仪表盘
    renderDashboard();

    // 展开底部面板
    expandBottomPanel();

    // 启动后台讨论 - 传递所有模式
    try {
      console.log('[Sidebar] 准备发送 START_DISCUSSION', {
        discussionId: discussion.id,
        modes: state.discussionModes,
        modelsCount: selectedConfigs.length,
        models: selectedConfigs.map(m => ({ id: m.id, name: m.name, hasApiKey: !!m.apiKey }))
      });

      const response = await chrome.runtime.sendMessage({
        type: 'START_DISCUSSION',
        data: {
          discussionId: discussion.id,
          requirement,
          modes: state.discussionModes, // 传递模式数组
          currentModeIndex: 0, // 从第一个模式开始
          models: selectedConfigs,
          totalRounds: state.discussionModes.length, // 轮次数 = 模式数
          hostModel: hostConfig // 主持人配置
        }
      });

      console.log('[Sidebar] START_DISCUSSION 响应:', response);

      if (response && response.error) {
        throw new Error(response.message || response.error);
      }

      const modeNames = state.discussionModes.map(m => getModeName(m)).join(' → ');
      showToast(`讨论已启动: ${modeNames}`, 'success');
    } catch (error) {
      console.error('[Sidebar] 启动讨论失败:', error);
      showToast('启动讨论失败: ' + error.message, 'error');
      StateManager.updateDiscussionProgress(discussion.id, { status: 'error', error: error.message });
      renderDashboard();
    }
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

        // 显示在标签页中（而不是跳转到 document 视图）
        elements.discussionDocument.innerHTML = marked.parse(response.data.document);

        // 切换到文档标签页
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="document"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        elements.discussionDocument.classList.add('active');

        // 保存到存储
        StateManager.saveDiscussions();

        elements.exportBtn.disabled = false;
        showToast('文档生成成功！', 'success');
      }
    } catch (error) {
      showToast('生成文档失败: ' + error.message, 'error');
    }
  }

  // 导出当前讨论
  function exportCurrentDiscussion() {
    // 判断当前激活的标签页
    const isDocumentTab = document.querySelector('.tab-btn[data-tab="document"]').classList.contains('active');

    if (isDocumentTab && state.currentDiscussion?.finalDoc) {
      // 导出文档
      downloadFile('product-document.md', state.currentDiscussion.finalDoc);
      showToast('文档已下载', 'success');
    } else {
      // 导出讨论消息
      const content = state.messages.map(m => `## ${m.model}\n\n${m.content}`).join('\n\n---\n\n');
      downloadFile('discussion.md', content);
      showToast('讨论消息已下载', 'success');
    }
  }

  // 复制文档
  async function copyDocument() {
    if (state.currentDiscussion?.finalDoc) {
      try {
        await navigator.clipboard.writeText(state.currentDiscussion.finalDoc);
        showToast('文档已复制到剪贴板', 'success');
      } catch (err) {
        showToast('复制失败，请手动复制', 'error');
      }
    }
  }

  // 导出文档
  function exportDocument() {
    if (state.currentDiscussion?.finalDoc) {
      downloadFile('product-document.md', state.currentDiscussion.finalDoc);
    }
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
