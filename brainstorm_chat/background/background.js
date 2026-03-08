// AI 讨论助手 - Background Service Worker (重构版 - 支持多讨论并行)
'use strict';

// 侧边栏设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// 运行中的讨论映射 (discussionId -> discussionController)
const runningDiscussions = new Map();

// 讨论控制器
class DiscussionController {
  constructor(discussionId, requirement, modes, models, totalRounds) {
    this.discussionId = discussionId;
    this.requirement = requirement;
    // 支持单模式或多模式
    this.modes = Array.isArray(modes) ? modes : [modes];
    this.currentModeIndex = 0;
    this.models = models;
    this.totalRounds = totalRounds;
    this.currentRound = 1;
    this.messages = [];
    this.status = 'running'; // 'running' | 'paused' | 'completed' | 'error' | 'cancelled'
    this.error = null;
    this.abortController = new AbortController();
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
    chrome.runtime.sendMessage(update).catch(err => {
      // sidebar 可能未打开，忽略错误
      if (!err.message?.includes('Could not establish connection')) {
        console.error('广播更新失败:', err);
      }
    });
  }

  // 更新模型状态
  updateModelStatus(modelId, status, progress, response = null, error = null) {
    this.broadcastUpdate({
      type: 'MODEL_STATUS_UPDATE',
      discussionId: this.discussionId,
      modelId,
      status,
      progress,
      response,
      error,
      currentMode: this.currentMode,
      currentModeIndex: this.currentModeIndex,
      totalModes: this.modes.length
    });
  }

  // 运行下一轮
  async runNextRound() {
    if (this.status !== 'running') return;

    // 检查是否所有模式都已完成
    if (this.currentModeIndex >= this.modes.length) {
      this.status = 'completed';
      this.broadcastUpdate({
        type: 'DISCUSSION_COMPLETED',
        discussionId: this.discussionId,
        messages: this.messages
      });
      runningDiscussions.delete(this.discussionId);
      return;
    }

    // 检查当前模式是否完成所有轮次
    if (this.currentRound > this.totalRounds) {
      // 切换到下一个模式
      this.currentModeIndex++;
      this.currentRound = 1;

      if (this.currentModeIndex >= this.modes.length) {
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

      if (this.status === 'cancelled') return;

      // 保存本轮结果
      this.messages.push({
        round: this.currentRound,
        mode: this.currentMode,
        modeIndex: this.currentModeIndex,
        responses: results
      });

      this.broadcastUpdate({
        type: 'ROUND_COMPLETE',
        discussionId: this.discussionId,
        round: this.currentRound,
        results
      });

      this.currentRound++;

      // 自动继续下一轮
      if (this.status === 'running') {
        await this.runNextRound();
      }
    } catch (error) {
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
    const systemPrompt = `你是一个产品需求分析助手。请基于用户的需求，从你的角度补充和完善产品文档。

讨论规则：
- 这是第 ${round} 轮讨论（共${this.totalRounds}轮）
- 你需要基于前一轮的观点，补充你的独特见解
- 重点关注：功能完整性、用户体验、技术可行性、潜在风险

请用 Markdown 格式输出你的观点。`;

    const context = previousMessages.length > 0
      ? `前一轮讨论摘要：\n${previousMessages.map(m => `${m.model}: ${m.content?.substring(0, 200)}...`).join('\n\n')}`
      : '';

    const userPrompt = `产品需求：\n${requirement}\n\n${context}\n\n请从你的专业角度分析这个需求，给出补充建议。`;

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

  // 头脑风暴模式
  async executeBrainstorm(requirement, models) {
    const systemPrompt = `你是一个创意头脑风暴助手。请针对用户需求，快速生成多个创意点子和想法。

讨论规则：
- 独立思考，不要受其他模型影响
- 注重创意的多样性和新颖性
- 给出具体可执行的建议

请用 Markdown 格式输出你的创意。`;

    const userPrompt = `产品需求：\n${requirement}\n\n请给出你的创意建议。`;

    const promises = models.map(async (model) => {
      this.updateModelStatus(model.id || model.name, 'running', 0);

      try {
        const response = await this.callModelWithTimeout(model, systemPrompt, userPrompt);

        this.updateModelStatus(model.id || model.name, 'completed', 100, response);

        return {
          model: model.name,
          content: response
        };
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);

        this.updateModelStatus(model.id || model.name, 'error', 0, null, error.message);

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

    const systemPrompt = isFirstRound
      ? `你是一个产品方案评审专家。请对用户需求进行全面评审。

讨论规则：
- 评估方案的可行性、完整性和潜在风险
- 给出建设性的改进建议
- 重点关注：技术风险、用户体验、商业价值

请用 Markdown 格式输出你的评审意见。`
      : `你是一个产品方案评审专家。上一轮评审已经提出了以下意见：

${previousMessages.map(m => `- ${m.model}: ${m.content?.substring(0, 300)}...`).join('\n')}

请针对这些意见，给出你的回应和补充评审。`;

    const userPrompt = `产品需求：\n${requirement}\n\n请给出你的评审意见。`;

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

  // 带超时的模型调用
  async callModelWithTimeout(model, systemPrompt, userPrompt, timeout = 120000) {
    return Promise.race([
      callModelAPI(model, systemPrompt, userPrompt),
      new Promise((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('请求超时'));
        }, timeout);

        // 监听取消信号
        const checkCancelled = setInterval(() => {
          if (this.status === 'cancelled') {
            clearTimeout(timer);
            clearInterval(checkCancelled);
            reject(new Error('已取消'));
          }
        }, 100);

        // 清理
        setTimeout(() => clearInterval(checkCancelled), timeout + 1000);
      })
    ]);
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
  if (!model.apiKey) {
    throw new Error(`请配置 ${model.name} 的 API Key`);
  }

  switch (model.provider) {
    case 'openai':
      return await callOpenAI(model, systemPrompt, userPrompt);
    case 'anthropic':
      return await callAnthropic(model, systemPrompt, userPrompt);
    case 'deepseek':
      return await callDeepSeek(model, systemPrompt, userPrompt);
    case 'qwen':
      return await callQwen(model, systemPrompt, userPrompt);
    case 'ernie':
      return await callErnie(model, systemPrompt, userPrompt);
    case 'glm':
      return await callGLM(model, systemPrompt, userPrompt);
    case 'moonshot':
      return await callMoonshot(model, systemPrompt, userPrompt);
    default:
      throw new Error(`不支持的提供商: ${model.provider}`);
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
  generate(messages, requirement) {
    const modelContents = messages.map(m =>
      `## ${m.model} 的建议\n\n${m.content}`
    ).join('\n\n---\n\n');

    const template = `# 产品需求文档

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

*本文档由 AI 多模型讨论生成*
`;

    return template;
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
      const { discussionId, requirement, modes, currentModeIndex, models, totalRounds } = data;

      // 检查是否已存在
      if (runningDiscussions.has(discussionId)) {
        throw new Error('讨论已在运行中');
      }

      // 创建控制器并启动 - 支持多模式
      const controller = new DiscussionController(
        discussionId, requirement, modes || ['round-table'], models, totalRounds
      );

      // 如果指定了当前模式索引，设置它
      if (currentModeIndex !== undefined) {
        controller.currentModeIndex = currentModeIndex;
      }

      runningDiscussions.set(discussionId, controller);

      // 异步启动，立即返回
      controller.runNextRound();

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
      const { messages, requirement } = data;
      const document = DocumentGenerator.generate(messages, requirement);
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
