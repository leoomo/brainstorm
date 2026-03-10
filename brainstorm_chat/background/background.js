// AI 讨论助手 - Background Service Worker (重构版 - 支持多讨论并行)
'use strict';

// 侧边栏设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// 运行中的讨论映射 (discussionId -> discussionController)
const runningDiscussions = new Map();

// 输出类型定义
const OUTPUT_TYPES = {
  '产品需求': {
    description: '产品功能、用户需求详细说明',
    template: 'product_requirement'
  },
  '技术方案': {
    description: '技术架构、实现方案、技术选型',
    template: 'technical'
  },
  '测试用例': {
    description: '测试场景、用例设计、测试计划',
    template: 'test_case'
  },
  '用户故事': {
    description: '用户故事、验收标准、优先级',
    template: 'user_story'
  },
  '商业分析': {
    description: '商业模式、市场分析、竞品研究',
    template: 'business'
  },
  'API设计': {
    description: '接口定义、参数说明、数据结构',
    template: 'api_design'
  }
};

// 讨论控制器
class DiscussionController {
  constructor(discussionId, requirement, modes, models, totalRounds, hostModel) {
    console.log('[DiscussionController] 构造函数被调用', { discussionId, modes, modelsCount: models?.length, totalRounds, hasHost: !!hostModel });

    this.discussionId = discussionId;
    this.requirement = requirement;
    // 支持单模式或多模式
    this.modes = Array.isArray(modes) ? modes : [modes];
    this.currentModeIndex = 0;
    this.models = models;
    this.totalRounds = totalRounds;
    this.hostModel = hostModel; // 主持人模型
    this.currentRound = 1;
    this.messages = [];
    this.status = 'running'; // 'running' | 'paused' | 'completed' | 'error' | 'cancelled'
    this.error = null;
    this.abortController = new AbortController();
    this.outputType = null; // 输出类型，由主持人识别

    console.log('[DiscussionController] 构造完成', { currentMode: this.currentMode, modes: this.modes });
  }

  // 获取当前模式
  get currentMode() {
    return this.modes[this.currentModeIndex];
  }

  // 获取当前模式名称
  getModeName(mode) {
    const names = {
      'round-table': '圆桌会议',
      'brainstorm': '头脑风暴',
      'debate': '辩论评审'
    };
    return names[mode] || mode;
  }

  // 识别输出类型
  async detectOutputType() {
    if (!this.hostModel) {
      // 无主持人时使用默认类型
      this.outputType = '产品需求';
      return this.outputType;
    }

    const typeList = Object.keys(OUTPUT_TYPES).join('、');
    const systemPrompt = `你是讨论主持人，负责分析用户需求并确定应该生成什么类型的文档。

可选的输出类型：
- 产品需求：产品功能、用户需求详细说明
- 技术方案：技术架构、实现方案、技术选型
- 测试用例：测试场景、用例设计、测试计划
- 用户故事：用户故事、验收标准、优先级
- 商业分析：商业模式、市场分析、竞品研究
- API设计：接口定义、参数说明、数据结构

任务：分析用户需求，选择最合适的输出类型。只输出类型名称，不要输出其他内容。`;

    const userPrompt = `用户需求：${this.requirement}\n\n请分析这个需求，判断应该输出什么类型的文档。只输出类型名称（如：产品需求、技术方案等）。`;

    try {
      const response = await this.callModelWithTimeout(this.hostModel, systemPrompt, userPrompt);
      const detectedType = response.trim();

      // 检查是否匹配预定义类型
      if (OUTPUT_TYPES[detectedType]) {
        this.outputType = detectedType;
      } else {
        // 未匹配到预定义类型，默认使用产品需求
        console.log('[DiscussionController] 输出类型未匹配:', detectedType, '使用默认: 产品需求');
        this.outputType = '产品需求';
      }

      console.log('[DiscussionController] 输出类型识别结果:', this.outputType);
      return this.outputType;
    } catch (error) {
      console.error('[DiscussionController] 输出类型识别失败:', error);
      this.outputType = '产品需求';
      return this.outputType;
    }
  }

  // 获取输出类型的角色描述
  getOutputTypeRole() {
    const roles = {
      '产品需求': '产品需求分析助手。请基于用户的需求，从你的角度补充和完善产品文档。',
      '技术方案': '技术架构师。请基于用户需求，提供技术实现方案和架构建议。',
      '测试用例': '测试工程师。请基于用户需求，设计测试用例和测试计划。',
      '用户故事': '产品经理。请基于用户需求，编写用户故事和验收标准。',
      '商业分析': '商业分析师。请基于用户需求，进行商业分析和市场研究。',
      'API设计': 'API 设计师。请基于用户需求，设计 API 接口和数据结构。'
    };
    return roles[this.outputType] || roles['产品需求'];
  }

  // 暂停讨论
  pause() {
    this.status = 'paused';
    this.broadcastUpdate({ type: 'DISCUSSION_PAUSED', discussionId: this.discussionId });
  }

  // 继续讨论
  resume() {
    this.status = 'running';
    this.broadcastUpdate({ type: 'DISCUSSION_RESUMED', discussionId: this.discussionId });
    this.runNextRound();
  }

  // 取消讨论
  cancel() {
    this.status = 'cancelled';
    this.abortController.abort();
    this.broadcastUpdate({ type: 'DISCUSSION_CANCELLED', discussionId: this.discussionId });
    runningDiscussions.delete(this.discussionId);
  }

  // 广播更新到所有监听者
  broadcastUpdate(update) {
    console.log('[DiscussionController] 广播更新:', update.type, update);

    chrome.runtime.sendMessage(update).catch(err => {
      // sidebar 可能未打开，忽略错误
      if (!err.message?.includes('Could not establish connection')) {
        console.error('广播更新失败:', err);
      }
    });
  }

  // 更新模型状态
  updateModelStatus(modelId, status, progress, response = null, error = null, isHost = false) {
    console.log('[DiscussionController] updateModelStatus 被调用', {
      discussionId: this.discussionId,
      modelId,
      status,
      progress,
      isHost
    });

    this.broadcastUpdate({
      type: 'MODEL_STATUS_UPDATE',
      discussionId: this.discussionId,
      modelId,
      status,
      progress,
      response,
      error,
      isHost,
      currentMode: this.currentMode,
      currentModeIndex: this.currentModeIndex,
      totalModes: this.modes.length
    });
  }

  // 运行下一轮
  async runNextRound() {
    console.log(`[DiscussionController] runNextRound - status: ${this.status}, modeIndex: ${this.currentModeIndex}, round: ${this.currentRound}, totalRounds: ${this.totalRounds}, modes.length: ${this.modes.length}`);

    if (this.status !== 'running') {
      console.log(`[DiscussionController] runNextRound 提前返回: status = ${this.status}`);
      return;
    }

    // 检查是否所有模式都已完成
    if (this.currentModeIndex >= this.modes.length) {
      console.log(`[DiscussionController] 所有模式已完成, modeIndex=${this.currentModeIndex}, modes.length=${this.modes.length}`);
      this.status = 'completed';
      this.broadcastUpdate({
        type: 'DISCUSSION_COMPLETED',
        discussionId: this.discussionId,
        messages: this.messages,
        outputType: this.outputType
      });
      runningDiscussions.delete(this.discussionId);
      return;
    }

    // 检查当前模式是否完成所有轮次
    if (this.currentRound > this.totalRounds) {
      console.log(`[DiscussionController] 模式完成所有轮次, currentRound=${this.currentRound}, totalRounds=${this.totalRounds}`);
      // 切换到下一个模式
      this.currentModeIndex++;
      this.currentRound = 1;

      if (this.currentModeIndex >= this.modes.length) {
        console.log(`[DiscussionController] 所有模式已完成 (切换后), modeIndex=${this.currentModeIndex}, modes.length=${this.modes.length}`);
        this.status = 'completed';
        this.broadcastUpdate({
          type: 'DISCUSSION_COMPLETED',
          discussionId: this.discussionId,
          messages: this.messages
        });
        runningDiscussions.delete(this.discussionId);
        return;
      }

      // 广播模式切换
      this.broadcastUpdate({
        type: 'MODE_SWITCH',
        discussionId: this.discussionId,
        currentMode: this.currentMode,
        currentModeIndex: this.currentModeIndex,
        totalModes: this.modes.length
      });
    }

    try {
      console.log(`[DiscussionController] 开始执行轮次 ${this.currentRound}, 模式: ${this.currentMode}`);

      // 第一轮时识别输出类型
      if (this.currentRound === 1 && this.currentModeIndex === 0 && !this.outputType) {
        console.log('[DiscussionController] 第一轮开始，识别输出类型...');
        await this.detectOutputType();
      }

      // 广播当前轮次开始
      this.broadcastUpdate({
        type: 'ROUND_START',
        discussionId: this.discussionId,
        round: this.currentRound,
        mode: this.currentMode,
        modeIndex: this.currentModeIndex,
        totalModes: this.modes.length
      });

      const results = await this.executeRound();

      console.log(`[DiscussionController] 轮次 ${this.currentRound} 完成, 结果数: ${results?.length || 0}`);

      if (this.status === 'cancelled') return;

      // 保存本轮结果
      this.messages.push({
        round: this.currentRound,
        mode: this.currentMode,
        modeIndex: this.currentModeIndex,
        responses: results,
        outputType: this.outputType
      });

      this.broadcastUpdate({
        type: 'ROUND_COMPLETE',
        discussionId: this.discussionId,
        round: this.currentRound,
        results
      });

      // 主持人汇总
      if (this.hostModel && this.status === 'running') {
        const hostSummary = await this.executeHostSummary(results);

        // 保存主持人汇总到消息中
        this.messages[this.messages.length - 1].hostSummary = hostSummary;

        // 广播主持人汇总
        this.broadcastUpdate({
          type: 'HOST_SUMMARY',
          discussionId: this.discussionId,
          round: this.currentRound,
          mode: this.currentMode,
          summary: hostSummary
        });
      }

      console.log(`[DiscussionController] 轮次 ${this.currentRound} 结束, 即将 currentRound++, 然后调用 runNextRound()`);
      this.currentRound++;
      console.log(`[DiscussionController] currentRound 变为 ${this.currentRound}, totalRounds = ${this.totalRounds}`);

      // 自动继续下一轮
      if (this.status === 'running') {
        console.log(`[DiscussionController] 准备调用 runNextRound() 继续...`);
        await this.runNextRound();
      } else {
        console.log(`[DiscussionController] 状态不是 running, 不继续, status = ${this.status}`);
      }
    } catch (error) {
      console.error(`[DiscussionController] 轮次执行失败:`, error);
      if (this.status !== 'cancelled') {
        this.status = 'error';
        this.error = error.message;
        this.broadcastUpdate({
          type: 'DISCUSSION_ERROR',
          discussionId: this.discussionId,
          error: error.message
        });
        runningDiscussions.delete(this.discussionId);
      }
    }
  }

  // 执行单轮讨论
  async executeRound() {
    const { requirement, currentMode, models, currentRound, messages } = this;

    console.log(`[DiscussionController] executeRound - 模式: ${currentMode}, 模型数: ${models?.length || 0}`);

    // 获取前一轮消息作为上下文
    const previousMessages = messages.length > 0 ? messages[messages.length - 1].responses : [];

    let results = [];

    switch (currentMode) {
      case 'round-table':
        results = await this.executeRoundTable(requirement, models, currentRound, previousMessages);
        break;
      case 'brainstorm':
        results = await this.executeBrainstorm(requirement, models);
        break;
      case 'debate':
        results = await this.executeDebate(requirement, models, currentRound, previousMessages);
        break;
      default:
        throw new Error(`未知的讨论模式: ${currentMode}`);
    }

    return results;
  }

  // 圆桌会议模式
  async executeRoundTable(requirement, models, round, previousMessages) {
    console.log(`[executeRoundTable] 开始 - 需求长度: ${requirement?.length || 0}, 模型数: ${models?.length || 0}, 轮次: ${round}`);

    const outputTypeRole = this.getOutputTypeRole();
    const systemPrompt = `你是一个${outputTypeRole}

讨论规则：
- 这是第 ${round} 轮讨论（共${this.totalRounds}轮）
- 你需要基于前一轮的观点，补充你的独特见解
- 重点关注：功能完整性、用户体验、技术可行性、潜在风险

请用 Markdown 格式输出你的观点。`;

    const context = previousMessages.length > 0
      ? `前一轮讨论摘要：\n${previousMessages.map(m => `${m.model}: ${m.content?.substring(0, 200)}...`).join('\n\n')}`
      : '';

    const userPrompt = `${this.outputType || '需求'}：\n${requirement}\n\n${context}\n\n请从你的专业角度分析，给出补充建议。`;

    const results = [];

    for (const model of models) {
      if (this.status === 'cancelled') break;

      console.log(`[executeRoundTable] 调用模型: ${model.name}, apiKey存在: ${!!model.apiKey}`);

      this.updateModelStatus(model.id || model.name, 'running', 0);

      try {
        const response = await this.callModelWithTimeout(model, systemPrompt, userPrompt);

        results.push({
          model: model.name,
          content: response
        });

        this.updateModelStatus(model.id || model.name, 'completed', 100, response);
      } catch (error) {
        console.error(`[executeRoundTable] 模型 ${model.name} 调用失败:`, error);
        results.push({
          model: model.name,
          content: `[错误] ${error.message}`,
          error: true
        });

        this.updateModelStatus(model.id || model.name, 'error', 0, null, error.message);
      }
    }

    console.log(`[executeRoundTable] 完成 - 结果数: ${results.length}`);
    return results;
  }

  // 头脑风暴模式
  async executeBrainstorm(requirement, models) {
    console.log('[executeBrainstorm] 开始执行', {
      modelsCount: models?.length,
      models: models?.map(m => ({ id: m.id, name: m.name, provider: m.provider }))
    });

    const outputTypeRole = this.getOutputTypeRole();
    const systemPrompt = `你是一个${outputTypeRole.replace('助手', '创意头脑风暴助手')}

讨论规则：
- 独立思考，不要受其他模型影响
- 注重创意的多样性和新颖性
- 给出具体可执行的建议

请用 Markdown 格式输出你的创意。`;

    const userPrompt = `${this.outputType || '需求'}：\n${requirement}\n\n请给出你的创意建议。`;

    const promises = models.map(async (model) => {
      const modelId = model.id || model.name;
      console.log('[executeBrainstorm] 准备调用模型:', { modelId, name: model.name });

      this.updateModelStatus(modelId, 'running', 0);

      try {
        console.log('[executeBrainstorm] 开始调用 callModelWithTimeout:', { modelId, name: model.name });
        const response = await this.callModelWithTimeout(model, systemPrompt, userPrompt);
        console.log('[executeBrainstorm] 模型调用成功, 准备更新状态:', { modelId, name: model.name, responseLength: response?.length });

        this.updateModelStatus(modelId, 'completed', 100, response);
        console.log('[executeBrainstorm] 模型状态已更新为 completed:', { modelId, name: model.name });

        return {
          model: model.name,
          content: response
        };
      } catch (error) {
        console.error(`[executeBrainstorm] 模型 ${model.name} 调用失败:`, error);

        this.updateModelStatus(modelId, 'error', 0, null, error.message);
        console.log('[executeBrainstorm] 模型状态已更新为 error:', { modelId, name: model.name });

        return {
          model: model.name,
          content: `[错误] ${error.message}`,
          error: true
        };
      }
    });

    return await Promise.all(promises);
  }

  // 辩论评审模式
  async executeDebate(requirement, models, round, previousMessages) {
    const isFirstRound = previousMessages.length === 0;
    const outputTypeRole = this.getOutputTypeRole();

    const systemPrompt = isFirstRound
      ? `你是一个${outputTypeRole.replace('助手', '方案评审专家')}

讨论规则：
- 评估方案的可行性、完整性和潜在风险
- 给出建设性的改进建议
- 重点关注：技术风险、用户体验、商业价值

请用 Markdown 格式输出你的评审意见。`
      : `你是一个${outputTypeRole.replace('助手', '方案评审专家')}。上一轮评审已经提出了以下意见：

${previousMessages.map(m => `- ${m.model}: ${m.content?.substring(0, 300)}...`).join('\n')}

请针对这些意见，给出你的回应和补充评审。`;

    const userPrompt = `${this.outputType || '需求'}：\n${requirement}\n\n请给出你的评审意见。`;

    const results = [];

    for (const model of models) {
      if (this.status === 'cancelled') break;

      this.updateModelStatus(model.id || model.name, 'running', 0);

      try {
        const response = await this.callModelWithTimeout(model, systemPrompt, userPrompt);

        results.push({
          model: model.name,
          content: response
        });

        this.updateModelStatus(model.id || model.name, 'completed', 100, response);
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        results.push({
          model: model.name,
          content: `[错误] ${error.message}`,
          error: true
        });

        this.updateModelStatus(model.id || model.name, 'error', 0, null, error.message);
      }
    }

    return results;
  }

  // 带超时的模型调用（带重试）
  async callModelWithTimeout(model, systemPrompt, userPrompt, timeout = 120000, maxRetries = 3) {
    console.log('[callModelWithTimeout] 开始', { modelName: model.name, timeout, maxRetries });

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[callModelWithTimeout] 第 ${attempt}/${maxRetries} 次尝试`, { modelName: model.name });

        // 检查是否已取消
        if (this.status === 'cancelled') {
          throw new Error('已取消');
        }

        let timer;
        let checkCancelled;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (checkCancelled) clearInterval(checkCancelled);
        };

        const result = await Promise.race([
          callModelAPI(model, systemPrompt, userPrompt),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              cleanup();
              console.log('[callModelWithTimeout] 请求超时', { modelName: model.name });
              reject(new Error('请求超时'));
            }, timeout);

            // 监听取消信号
            checkCancelled = setInterval(() => {
              if (this.status === 'cancelled') {
                cleanup();
                console.log('[callModelWithTimeout] 请求已取消', { modelName: model.name });
                reject(new Error('已取消'));
              }
            }, 100);
          })
        ]);

        cleanup();
        console.log('[callModelWithTimeout] 请求成功', { modelName: model.name, responseLength: result?.length });
        return result;

      } catch (error) {
        lastError = error;
        console.log(`[callModelWithTimeout] 第 ${attempt} 次尝试失败`, { modelName: model.name, error: error.message });

        // 如果是已取消，不重试
        if (error.message === '已取消') {
          throw error;
        }

        // 如果还有重试次数，等待后重试
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 递增延迟: 2s, 4s, 6s
          console.log(`[callModelWithTimeout] 等待 ${delay}ms 后重试...`, { modelName: model.name });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败
    console.log(`[callModelWithTimeout] 所有 ${maxRetries} 次尝试都失败`, { modelName: model.name, error: lastError.message });
    throw lastError;
  }

  // 执行主持人汇总
  async executeHostSummary(roundResults) {
    if (!this.hostModel) return null;

    const stage = this.getDiscussionStage();
    const prompt = this.getHostSummaryPrompt(stage, roundResults);

    console.log(`[DiscussionController] 主持人汇总 - 阶段: ${stage}, 模型: ${this.hostModel.name}`);

    this.updateModelStatus(this.hostModel.id || this.hostModel.name, 'running', 0, null, null, true);

    try {
      const response = await this.callModelWithTimeout(
        this.hostModel,
        prompt.system,
        prompt.user
      );

      this.updateModelStatus(this.hostModel.id || this.hostModel.name, 'completed', 100, response, null, true);

      return {
        model: this.hostModel.name,
        content: response,
        stage: stage
      };
    } catch (error) {
      console.error(`[DiscussionController] 主持人汇总失败:`, error);
      this.updateModelStatus(this.hostModel.id || this.hostModel.name, 'error', 0, null, error.message, true);
      return {
        model: this.hostModel.name,
        content: `[主持人汇总失败: ${error.message}]`,
        stage: stage,
        error: true
      };
    }
  }

  // 获取讨论阶段
  getDiscussionStage() {
    const mode = this.currentMode;
    const isLastRound = this.currentRound >= this.totalRounds;
    const isLastMode = this.currentModeIndex >= this.modes.length - 1;

    if (mode === 'brainstorm') return 'brainstorm_summary';
    if (mode === 'round-table') {
      if (isLastRound && isLastMode) return 'round_final';
      return 'round_summary';
    }
    if (mode === 'debate') return 'debate_summary';
    return 'unknown';
  }

  // 获取主持人汇总提示词
  getHostSummaryPrompt(stage, results) {
    const prompts = {
      'brainstorm_summary': {
        system: `你是讨论主持人，负责汇总头脑风暴的创意。

任务：
1. 提炼3-5个核心创意方向
2. 去除重复观点
3. 标注最有价值的建议
4. 列出需要进一步明确的问题

请用 Markdown 格式输出。`,
        user: `需求：${this.requirement}

以下是各模型的头脑风暴结果：

${results.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

请汇总以上创意。`
      },

      'round_summary': {
        system: `你是讨论主持人，负责整理圆桌讨论的观点。

任务：
1. 总结各模型的核心观点
2. 标注共识点和争议点
3. 补充遗漏的重要方面
4. 为下一轮讨论提供方向

请用 Markdown 格式输出。`,
        user: `需求：${this.requirement}

本轮讨论结果：

${results.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

请整理以上观点。`
      },

      'round_final': {
        system: `你是讨论主持人，负责汇总所有讨论并生成最终的需求文档框架。

任务：
1. 综合所有讨论内容
2. 提炼核心功能点
3. 梳理用户故事和使用场景
4. 列出技术要点和风险
5. 生成结构化的需求文档框架

请用 Markdown 格式输出。`,
        user: `需求：${this.requirement}

所有讨论结果：

${this.messages.map(m => `### 第${m.round}轮 (${this.getModeName(m.mode)})\n${m.responses.map(r => `**${r.model}**: ${r.content?.substring(0, 500)}...`).join('\n\n')}`).join('\n\n---\n\n')}

请生成最终的需求文档框架。`
      },

      'debate_summary': {
        system: `你是讨论主持人，负责总结辩论评审的结论。

任务：
1. 总结各方核心论点
2. 分析争议焦点
3. 给出平衡性建议
4. 为最终文档提供改进方向

请用 Markdown 格式输出。`,
        user: `需求：${this.requirement}

评审意见：

${results.map(r => `### ${r.model}\n${r.content}`).join('\n\n---\n\n')}

请总结评审结论。`
      }
    };

    return prompts[stage] || prompts['round_summary'];
  }
}

// 讨论引擎 (保留原有方法用于兼容性)
const DiscussionEngine = {
  // 圆桌会议模式
  async roundTable(requirement, models, round, previousMessages = []) {
    const systemPrompt = `你是一个产品需求分析助手。请基于用户的需求，从你的角度补充和完善产品文档。

讨论规则：
- 这是第 ${round} 轮讨论（共3轮）
- 你需要基于前一轮的观点，补充你的独特见解
- 重点关注：功能完整性、用户体验、技术可行性、潜在风险

请用 Markdown 格式输出你的观点。`;

    const context = previousMessages.length > 0
      ? `前一轮讨论摘要：\n${previousMessages.map(m => `${m.model}: ${m.content.substring(0, 200)}...`).join('\n\n')}`
      : '';

    const userPrompt = `产品需求：\n${requirement}\n\n${context}\n\n请从你的专业角度分析这个需求，给出补充建议。`;

    const results = [];

    for (const model of models) {
      try {
        const response = await callModelAPI(model, systemPrompt, userPrompt);
        results.push({
          model: model.name,
          content: response
        });
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        results.push({
          model: model.name,
          content: `[错误] ${error.message}`,
          error: true
        });
      }
    }

    return results;
  },

  // 头脑风暴模式
  async brainstorm(requirement, models) {
    const systemPrompt = `你是一个创意头脑风暴助手。请针对用户需求，快速生成多个创意点子和想法。

讨论规则：
- 独立思考，不要受其他模型影响
- 注重创意的多样性和新颖性
- 给出具体可执行的建议

请用 Markdown 格式输出你的创意。`;

    const userPrompt = `产品需求：\n${requirement}\n\n请给出你的创意建议。`;

    // 并发调用所有模型
    const promises = models.map(async (model) => {
      try {
        const response = await callModelAPI(model, systemPrompt, userPrompt);
        return {
          model: model.name,
          content: response
        };
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        return {
          model: model.name,
          content: `[错误] ${error.message}`,
          error: true
        };
      }
    });

    return await Promise.all(promises);
  },

  // 辩论评审模式
  async debate(requirement, models, round, previousMessages = []) {
    const isFirstRound = previousMessages.length === 0;

    const systemPrompt = isFirstRound
      ? `你是一个产品方案评审专家。请对用户需求进行全面评审。

讨论规则：
- 评估方案的可行性、完整性和潜在风险
- 给出建设性的改进建议
- 重点关注：技术风险、用户体验、商业价值

请用 Markdown 格式输出你的评审意见。`
      : `你是一个产品方案评审专家。上一轮评审已经提出了以下意见：

${previousMessages.map(m => `- ${m.model}: ${m.content.substring(0, 300)}...`).join('\n')}

请针对这些意见，给出你的回应和补充评审。`;

    const userPrompt = `产品需求：\n${requirement}\n\n请给出你的评审意见。`;

    const results = [];

    for (const model of models) {
      try {
        const response = await callModelAPI(model, systemPrompt, userPrompt);
        results.push({
          model: model.name,
          content: response
        });
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        results.push({
          model: model.name,
          content: `[错误] ${error.message}`,
          error: true
        });
      }
    }

    return results;
  }
};

// 发送流式消息到 popup
// 调用模型 API
async function callModelAPI(model, systemPrompt, userPrompt) {
  console.log(`[Background] 开始调用模型: ${model.name} (${model.provider})`);
  const startTime = Date.now();

  if (!model.apiKey) {
    throw new Error(`请配置 ${model.name} 的 API Key`);
  }

  try {
    let result;
    switch (model.provider) {
      case 'openai':
        result = await callOpenAI(model, systemPrompt, userPrompt);
        break;
      case 'anthropic':
        result = await callAnthropic(model, systemPrompt, userPrompt);
        break;
      case 'deepseek':
        result = await callDeepSeek(model, systemPrompt, userPrompt);
        break;
      case 'qwen':
        result = await callQwen(model, systemPrompt, userPrompt);
        break;
      case 'ernie':
        result = await callErnie(model, systemPrompt, userPrompt);
        break;
      case 'glm':
        result = await callGLM(model, systemPrompt, userPrompt);
        break;
      case 'moonshot':
        result = await callMoonshot(model, systemPrompt, userPrompt);
        break;
      default:
        throw new Error(`不支持的提供商: ${model.provider}`);
    }

    console.log(`[Background] 模型 ${model.name} 调用成功，响应长度: ${result?.length || 0}`);
    return result;
  } catch (error) {
    console.error(`[Background] 模型 ${model.name} 调用失败:`, error);
    throw error;
  }
}

// 校验 API Key
async function validateApiKey(provider, apiKey, modelName) {
  const model = { provider, apiKey, model: modelName, endpoint: '' };

  try {
    // 使用简单的测试提示
    const testPrompt = 'Hi';

    switch (provider) {
      case 'openai':
        await callOpenAI(model, 'You are a helpful assistant.', testPrompt);
        return true;
      case 'anthropic':
        await callAnthropic(model, 'You are a helpful assistant.', testPrompt);
        return true;
      case 'deepseek':
        await callDeepSeek(model, 'You are a helpful assistant.', testPrompt);
        return true;
      case 'qwen':
        await callQwen(model, 'You are a helpful assistant.', testPrompt);
        return true;
      case 'ernie':
        await callErnie(model, 'You are a helpful assistant.', testPrompt);
        return true;
      case 'glm':
        await callGLM(model, 'You are a helpful assistant.', testPrompt);
        return true;
      case 'moonshot':
        await callMoonshot(model, 'You are a helpful assistant.', testPrompt);
        return true;
      default:
        // 自定义 provider 也尝试调用
        await callOpenAI(model, 'You are a helpful assistant.', testPrompt);
        return true;
    }
  } catch (error) {
    console.error('API 校验失败:', error);
    return false;
  }
}

// OpenAI API 调用
async function callOpenAI(model, systemPrompt, userPrompt) {
  // 修正错误的 endpoint
  let endpoint = model.endpoint || '';
  const correctEndpoint = 'https://api.openai.com/v1/chat/completions';
  if (!endpoint || !endpoint.includes('openai')) {
    endpoint = correctEndpoint;
  }
  const modelName = model.model || 'gpt-4o';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Anthropic API 调用
async function callAnthropic(model, systemPrompt, userPrompt) {
  // 修正错误的 endpoint
  let endpoint = model.endpoint || '';
  const correctEndpoint = 'https://api.anthropic.com/v1/messages';
  if (!endpoint || !endpoint.includes('anthropic')) {
    endpoint = correctEndpoint;
  }
  const modelName = model.model || 'claude-3-opus-20240229';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': model.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// DeepSeek API 调用
async function callDeepSeek(model, systemPrompt, userPrompt) {
  // DeepSeek 使用 OpenAI 兼容格式，端点应该是 https://api.deepseek.com/chat/completions
  // 兼容处理：修正任何错误的 endpoint
  const correctEndpoint = 'https://api.deepseek.com/chat/completions';
  let endpoint = model.endpoint || '';

  // 如果不是正确的端点，就使用默认的正确端点
  if (!endpoint || endpoint !== correctEndpoint) {
    endpoint = correctEndpoint;
    console.log('DeepSeek: 使用修正后的端点', endpoint);
  } else {
    console.log('DeepSeek: 使用配置中的端点', endpoint);
  }
  const modelName = model.model || 'deepseek-chat';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API 错误:', response.status, errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.message || `API 请求失败: ${response.status}`);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`API 请求失败: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      throw e;
    }
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 通义千问 (Qwen) API 调用
async function callQwen(model, systemPrompt, userPrompt) {
  // 修正错误的 endpoint
  let endpoint = model.endpoint || '';
  const correctEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  if (!endpoint || !endpoint.includes('dashscope')) {
    endpoint = correctEndpoint;
    console.log('Qwen: 使用修正后的端点', endpoint);
  } else {
    console.log('Qwen: 使用配置中的端点', endpoint);
  }
  const modelName = model.model || 'qwen-plus';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 文心一言 (ERNIE) API 调用
async function callErnie(model, systemPrompt, userPrompt) {
  const endpoint = model.endpoint || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/chat/completions_ernie';
  const modelName = model.model || 'ernie-4.0-8k';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// GLM API 调用
async function callGLM(model, systemPrompt, userPrompt) {
  // 修正错误的 endpoint
  let endpoint = model.endpoint || '';
  const correctEndpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  if (!endpoint || !endpoint.includes('bigmodel')) {
    endpoint = correctEndpoint;
    console.log('GLM: 使用修正后的端点', endpoint);
  } else {
    console.log('GLM: 使用配置中的端点', endpoint);
  }
  const modelName = model.model || 'glm-5';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Moonshot (Kimi) API 调用
async function callMoonshot(model, systemPrompt, userPrompt) {
  // 修正错误的 endpoint
  let endpoint = model.endpoint || '';
  const correctEndpoint = 'https://api.moonshot.cn/v1/chat/completions';
  if (!endpoint || !endpoint.includes('moonshot')) {
    endpoint = correctEndpoint;
    console.log('Moonshot: 使用修正后的端点', endpoint);
  } else {
    console.log('Moonshot: 使用配置中的端点', endpoint);
  }
  const modelName = model.model || 'moonshot-v1-8k';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 文档生成器
const DocumentGenerator = {
  generate(messages, requirement, outputType = '产品需求') {
    const modelContents = messages.map(m =>
      `## ${m.model} 的建议\n\n${m.content}`
    ).join('\n\n---\n\n');

    // 根据输出类型选择模板
    const templates = {
      '产品需求': `# 产品需求文档

## 1. 需求概述

${requirement}

## 2. 功能需求

${extractSection(modelContents, ['功能', '需求', 'feature'])}

## 3. 非功能需求

${extractSection(modelContents, ['性能', '安全', '非功能', 'performance', 'security'])}

## 4. 界面设计建议

${extractSection(modelContents, ['界面', 'UI', '设计', '用户体验', 'UX'])}

## 5. 技术建议

${extractSection(modelContents, ['技术', '实现', '方案', '技术选型'])}

## 6. 潜在风险与建议

${extractSection(modelContents, ['风险', '问题', '建议', '注意事项'])}

---

*本文档由 AI 多模型讨论生成*`,

      '技术方案': `# 技术方案文档

## 1. 需求概述

${requirement}

## 2. 技术架构

${extractSection(modelContents, ['架构', '技术架构', 'architecture'])}

## 3. 技术选型

${extractSection(modelContents, ['技术选型', '选型', '技术栈'])}

## 4. 核心模块设计

${extractSection(modelContents, ['模块', '设计', '核心'])}

## 5. 数据结构

${extractSection(modelContents, ['数据', '结构', '数据库', 'schema'])}

## 6. 接口设计

${extractSection(modelContents, ['接口', 'API', '接口设计'])}

## 7. 部署方案

${extractSection(modelContents, ['部署', '运维', 'devops'])}

---

*本文档由 AI 多模型讨论生成*`,

      '测试用例': `# 测试用例文档

## 1. 测试目标

${requirement}

## 2. 测试范围

${extractSection(modelContents, ['范围', '测试范围'])}

## 3. 功能测试用例

${extractSection(modelContents, ['功能', '用例', '测试用例', 'test case'])}

## 4. 接口测试用例

${extractSection(modelContents, ['接口', 'API', '接口测试'])}

## 5. 性能测试用例

${extractSection(modelContents, ['性能', '压力', '性能测试'])}

## 6. 边界条件

${extractSection(modelContents, ['边界', '异常', '边界条件'])}

---

*本文档由 AI 多模型讨论生成*`,

      '用户故事': `# 用户故事文档

## 1. 需求概述

${requirement}

## 2. 用户角色

${extractSection(modelContents, ['角色', '用户角色', 'user role'])}

## 3. 用户故事

${extractSection(modelContents, ['用户故事', 'story', '场景'])}

## 4. 验收标准

${extractSection(modelContents, ['验收', '标准', 'acceptance', 'AC'])}

## 5. 优先级

${extractSection(modelContents, ['优先级', 'priority'])}

## 6. 依赖关系

${extractSection(modelContents, ['依赖', 'dependencies'])}

---

*本文档由 AI 多模型讨论生成*`,

      '商业分析': `# 商业分析文档

## 1. 业务背景

${requirement}

## 2. 市场分析

${extractSection(modelContents, ['市场', 'market', '市场分析'])}

## 3. 竞品分析

${extractSection(modelContents, ['竞品', '竞争', 'competitor'])}

## 4. 商业模式

${extractSection(modelContents, ['商业', '模式', 'business model'])}

## 5. 盈利分析

${extractSection(modelContents, ['盈利', '收入', 'revenue', '商业化'])}

## 6. 风险与机会

${extractSection(modelContents, ['风险', '机会', 'risk', 'opportunity'])}

---

*本文档由 AI 多模型讨论生成*`,

      'API设计': `# API 设计文档

## 1. 需求概述

${requirement}

## 2. 接口概览

${extractSection(modelContents, ['接口', '概览', 'overview'])}

## 3. 认证授权

${extractSection(modelContents, ['认证', '授权', 'auth', 'token'])}

## 4. 接口详情

${extractSection(modelContents, ['接口', 'API', 'endpoint'])}

## 5. 数据结构

${extractSection(modelContents, ['数据', '结构', 'schema', 'model'])}

## 6. 错误码

${extractSection(modelContents, ['错误', 'error', 'code'])}

## 7. 限流策略

${extractSection(modelContents, ['限流', 'rate limit', '配额'])}

---

*本文档由 AI 多模型讨论生成*`
    };

    return templates[outputType] || templates['产品需求'];
  }
};

// 从内容中提取相关章节
function extractSection(content, keywords) {
  const lines = content.split('\n');
  const relevantLines = [];

  let charCount = 0;
  for (const line of lines) {
    if (charCount >= 500) break;
    if (!line.startsWith('#') && line.trim()) {
      relevantLines.push(line);
      charCount += line.length;
    }
  }

  return relevantLines.join('\n') || '暂无相关内容，请参考各模型的详细建议。';
}

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理异步消息
  handleMessage(message)
    .then(sendResponse)
    .catch(error => {
      console.error('处理消息错误:', error);
      sendResponse({ type: 'ERROR', message: error.message });
    });

  // 返回 true 表示异步响应
  return true;
});

async function handleMessage(message) {
  const { type, data } = message;

  switch (type) {
    // 新讨论系统
    case 'START_DISCUSSION': {
      const { discussionId, requirement, modes, currentModeIndex, models, totalRounds, hostModel } = data;

      console.log('[Background] 收到 START_DISCUSSION:', {
        discussionId,
        requirement: requirement?.substring(0, 50),
        modes,
        modelsCount: models?.length,
        hasHost: !!hostModel,
        models: models?.map(m => ({
          id: m.id,
          idType: typeof m.id,
          name: m.name,
          provider: m.provider,
          hasApiKey: !!m.apiKey
        }))
      });

      // 检查是否已存在
      if (runningDiscussions.has(discussionId)) {
        throw new Error('讨论已在运行中');
      }

      // 验证模型配置
      if (!models || models.length === 0) {
        throw new Error('没有选择任何模型');
      }

      const invalidModels = models.filter(m => !m.apiKey);
      if (invalidModels.length > 0) {
        throw new Error(`以下模型缺少 API Key: ${invalidModels.map(m => m.name).join(', ')}`);
      }

      // 验证主持人模型
      if (hostModel && !hostModel.apiKey) {
        throw new Error(`主持人模型 ${hostModel.name} 缺少 API Key`);
      }

      // 创建控制器并启动 - 支持多模式和主持人
      const controller = new DiscussionController(
        discussionId, requirement, modes || ['round-table'], models, totalRounds, hostModel
      );

      // 如果指定了当前模式索引，设置它
      if (currentModeIndex !== undefined) {
        controller.currentModeIndex = currentModeIndex;
      }

      runningDiscussions.set(discussionId, controller);

      // 异步启动，立即返回，但捕获错误
      controller.runNextRound().catch(error => {
        console.error('[Background] runNextRound 错误:', error);
        controller.status = 'error';
        controller.error = error.message;
        controller.broadcastUpdate({
          type: 'DISCUSSION_ERROR',
          discussionId,
          error: error.message
        });
        runningDiscussions.delete(discussionId);
      });

      console.log('[Background] 讨论已启动，等待执行...');

      return {
        type: 'DISCUSSION_STARTED',
        discussionId,
        status: 'running',
        modes: controller.modes,
        currentMode: controller.currentMode
      };
    }

    case 'PAUSE_DISCUSSION': {
      const { discussionId } = data;
      const controller = runningDiscussions.get(discussionId);
      if (!controller) {
        // 讨论可能已完成或出错，返回已完成状态
        return { type: 'DISCUSSION_NOT_RUNNING', discussionId, reason: '讨论已完成或不在运行中' };
      }

      controller.pause();
      return { type: 'DISCUSSION_PAUSED', discussionId };
    }

    case 'RESUME_DISCUSSION': {
      const { discussionId } = data;
      const controller = runningDiscussions.get(discussionId);
      if (!controller) {
        // 讨论可能已完成或出错
        return { type: 'DISCUSSION_NOT_RUNNING', discussionId, reason: '讨论已完成或不在运行中' };
      }

      controller.resume();
      return { type: 'DISCUSSION_RESUMED', discussionId };
    }

    case 'CANCEL_DISCUSSION': {
      const { discussionId } = data;
      const controller = runningDiscussions.get(discussionId);
      if (controller) {
        controller.cancel();
      }
      return { type: 'DISCUSSION_CANCELLED', discussionId };
    }

    case 'GET_DISCUSSION_STATUS': {
      const { discussionId } = data;
      const controller = runningDiscussions.get(discussionId);
      if (!controller) {
        return { type: 'DISCUSSION_NOT_FOUND', discussionId };
      }

      return {
        type: 'DISCUSSION_STATUS',
        discussionId,
        status: controller.status,
        currentRound: controller.currentRound,
        totalRounds: controller.totalRounds,
        progress: controller.messages.length > 0
          ? (controller.currentRound - 1) / controller.totalRounds * 100
          : 0
      };
    }

    // 兼容旧版本
    case 'START_DISCUSSION_LEGACY': {
      const { requirement, mode, models, round } = data;

      let results;
      switch (mode) {
        case 'round-table':
          results = await DiscussionEngine.roundTable(requirement, models, round);
          break;
        case 'brainstorm':
          results = await DiscussionEngine.brainstorm(requirement, models);
          break;
        case 'debate':
          results = await DiscussionEngine.debate(requirement, models, round);
          break;
        default:
          throw new Error(`未知的讨论模式: ${mode}`);
      }

      return { type: 'ROUND_COMPLETE', data: { results } };
    }

    case 'CONTINUE_DISCUSSION': {
      const { messages, mode, models, round } = data;

      let results;
      switch (mode) {
        case 'round-table':
          results = await DiscussionEngine.roundTable(
            messages[0]?.content || '',
            models,
            round,
            messages
          );
          break;
        case 'debate':
          results = await DiscussionEngine.debate(
            messages[0]?.content || '',
            models,
            round,
            messages
          );
          break;
        default:
          results = [];
      }

      return { type: 'ROUND_COMPLETE', data: { results } };
    }

    case 'GENERATE_DOCUMENT': {
      const { messages, requirement, outputType } = data;
      const document = DocumentGenerator.generate(messages, requirement, outputType);
      return { type: 'DOCUMENT_GENERATED', data: { document } };
    }

    case 'VALIDATE_API': {
      const { provider, apiKey, model } = data;
      const isValid = await validateApiKey(provider, apiKey, model);
      return { success: isValid };
    }

    default:
      throw new Error(`未知的消息类型: ${type}`);
  }
}

// ========== 浏览器通知系统 ==========

// 发送通知 (使用 Chrome 扩展 notifications API)
function sendNotification(title, options = {}) {
  const notificationId = options.tag || ('notification_' + Date.now());

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title: title,
    message: options.body || '',
    requireInteraction: options.requireInteraction || false
  }, (id) => {
    if (chrome.runtime.lastError) {
      console.log('通知创建失败:', chrome.runtime.lastError.message);
    }
  });
}

// 监听通知点击
chrome.notifications.onClicked.addListener((notificationId) => {
  // 打开侧边栏
  chrome.windows.getCurrent((window) => {
    if (window) {
      chrome.sidePanel.open({ windowId: window.id });
    }
  });
  chrome.notifications.clear(notificationId);
});

// 讨论完成通知
function notifyDiscussionCompleted(discussion) {
  sendNotification('讨论完成', {
    body: `"${discussion.title}" - 所有模型已回复`,
    tag: `discussion-${discussion.id}`
  });
}

// 讨论错误通知
function notifyDiscussionError(discussion, error) {
  sendNotification('讨论出错', {
    body: `"${discussion.title}" - ${error}`,
    tag: `discussion-error-${discussion.id}`
  });
}

// 监听讨论状态变化，发送通知
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DISCUSSION_COMPLETED') {
    const { discussionId } = message;
    // 延迟发送通知，确保 sidebar 已保存状态
    setTimeout(() => {
      sendNotification('讨论完成', {
        body: `讨论 ID: ${discussionId} 已完成`,
        tag: `discussion-${discussionId}`
      });
    }, 500);
  }

  if (message.type === 'DISCUSSION_ERROR') {
    const { discussionId, error } = message;
    setTimeout(() => {
      sendNotification('讨论出错', {
        body: `讨论 ID: ${discussionId} - ${error}`,
        tag: `discussion-error-${discussionId}`
      });
    }, 500);
  }
});

// 首次安装时
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI 讨论助手已安装');
});
