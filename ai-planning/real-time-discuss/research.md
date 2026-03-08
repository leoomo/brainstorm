# AI 讨论助手 - 实时显示功能 Research

## 1. 项目概述

- 项目名称：AI 讨论助手 Chrome 扩展
- 项目路径：/Users/zen/projects/brainstorm/brainstorm_chat/
- Manifest：V3

## 2. 现有架构

### 2.1 manifest.json 配置
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "sidePanel"],
  "side_panel": { "default_path": "sidebar/sidebar.html" },
  "background": { "service_worker": "background/background.js" }
}
```

### 2.2 消息通信机制
- sidebar 和 background 之间通过 `chrome.runtime.sendMessage()` 通信
- 消息类型：START_DISCUSSION, CONTINUE_DISCUSSION, GENERATE_DOCUMENT, VALIDATE_API

### 2.3 页面结构
- sidebar/sidebar.html - 主界面
- sidebar/sidebar.js - 页面逻辑
- shared/state.js - 状态管理

### 2.4 DiscussionEngine (background.js)
```javascript
const DiscussionEngine = {
  async roundTable(requirement, models, round, previousMessages) {
    // 顺序调用每个模型
    for (const model of models) {
      const response = await callModelAPI(model, systemPrompt, userPrompt);
      results.push({ model: model.name, content: response });
    }
    return results;
  },
  async brainstorm(requirement, models) { /* 并行调用 */ },
  async debate(requirement, models, round, previousMessages) { /* 辩论模式 */ }
};
```

## 3. 技术挑战分析

### 3.1 Service Worker 消息推送问题
- Chrome 扩展的 Service Worker 无法主动推送消息到标签页
- 需要建立持久的消息连接

### 3.2 流式响应问题
- 当前实现是批量返回结果，非流式
- 需要支持 streaming API

### 3.3 消息通道选择
- Option A: MessageChannel (port1/port2)
- Option B: chrome.runtime.connect
- Option C: 在页面加载时建立连接

## 4. 现有代码文件

| 文件 | 用途 |
|------|------|
| manifest.json | 扩展配置 |
| background/background.js | Service Worker，API 调用 |
| sidebar/sidebar.html | 主界面 |
| sidebar/sidebar.js | 页面逻辑 |
| shared/state.js | 状态管理 |
| shared/utils.js | 工具函数 |
| shared/components.js | UI 组件 |
| styles/main.css | 样式 |

## 5. 实现思路

### 5.1 新增文件
- discuss/discuss.html - 实时显示页面
- discuss/discuss.js - 实时页面逻辑
- discuss/discuss.css - 实时页面样式

### 5.2 需要修改的文件
- manifest.json - 添加 tabs 权限
- background.js - 添加消息推送逻辑
- sidebar.html - 添加运行模式选择
- sidebar.js - 添加打开实时页面的逻辑

### 5.3 消息格式设计
```javascript
{ type: 'MODEL_START', data: { model: 'DeepSeek' } }
{ type: 'MODEL_STREAM', data: { model: 'DeepSeek', content: '部分回复' } }
{ type: 'MODEL_COMPLETE', data: { model: 'DeepSeek', content: '完整回复' } }
{ type: 'MODEL_ERROR', data: { model: 'DeepSeek', error: '错误信息' } }
{ type: 'DISCUSSION_END', data: { results: [...] } }
```

## 6. 风险评估

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| MessageChannel 连接失败 | 实时显示无法工作 | 降级为后台模式 |
| 流式 API 兼容性 | 部分 provider 不支持 | 仅在支持 streaming 的 provider 上启用 |
| 页面加载时机 | 建立连接时讨论已开始 | 使用 localStorage 或 URL 参数传递状态 |
