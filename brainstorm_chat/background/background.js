// AI 讨论助手 - Background Service Worker
'use strict';

// 消息端口管理
let messagePort = null;

// 侧边栏设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// 讨论引擎
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
        sendStreamMessage(model.name, '', true); // 开始流式输出
        const response = await callModelAPI(model, systemPrompt, userPrompt);
        sendStreamMessage(model.name, response, false); // 结束流式输出
        results.push({
          model: model.name,
          content: response
        });
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        sendStreamMessage(model.name, `[错误] ${error.message}`, false);
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
        sendStreamMessage(model.name, '', true);
        const response = await callModelAPI(model, systemPrompt, userPrompt);
        sendStreamMessage(model.name, response, false);
        return {
          model: model.name,
          content: response
        };
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        sendStreamMessage(model.name, `[错误] ${error.message}`, false);
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
        sendStreamMessage(model.name, '', true);
        const response = await callModelAPI(model, systemPrompt, userPrompt);
        sendStreamMessage(model.name, response, false);
        results.push({
          model: model.name,
          content: response
        });
      } catch (error) {
        console.error(`模型 ${model.name} 调用失败:`, error);
        sendStreamMessage(model.name, `[错误] ${error.message}`, false);
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
function sendStreamMessage(model, content, isThinking) {
  if (messagePort) {
    messagePort.postMessage({
      type: 'STREAM_MESSAGE',
      data: { model, content, isThinking }
    });
  }
}

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
  const endpoint = model.endpoint || 'https://api.openai.com/v1/chat/completions';
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
  const endpoint = model.endpoint || 'https://api.anthropic.com/v1/messages';
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
  // DeepSeek 使用 OpenAI 兼容格式，默认端点不带 /v1
  const endpoint = model.endpoint || 'https://api.deepseek.com/chat/completions';
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
  const endpoint = model.endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
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
  const endpoint = model.endpoint || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const modelName = model.model || 'glm-4-plus';

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
  const endpoint = model.endpoint || 'https://api.moonshot.cn/v1/chat/completions';
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
  // 尝试获取发送消息的标签页的端口
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      messagePort = chrome.tabs.connect(tabs[0].id);
    }
  });

  handleMessage(message)
    .then(sendResponse)
    .catch(error => {
      sendResponse({ type: 'ERROR', message: error.message });
    });

  return true;
});

async function handleMessage(message) {
  const { type, data } = message;

  switch (type) {
    case 'START_DISCUSSION': {
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
