# AI 讨论助手 - 讨论流程优化 Research

## 1. 项目概述

- 项目名称：AI 讨论助手 Chrome 扩展
- 项目路径：`/Users/zen/projects/brainstorm/brainstorm_chat/`

## 2. 问题描述

### 当前问题
- 开始讨论 → 讨论界面 → 点击返回 → 主界面
- 返回主界面后，无法查看之前的讨论内容
- 只能通过"历史"按钮查看已保存的内容
- 未保存/进行中的讨论会丢失

### 核心矛盾
- 讨论进行中/未保存的内容 vs 已保存的历史
- 两个状态分离，用户体验不连贯

## 3. 现有架构

### 视图结构
```
sidebar/sidebar.html 包含 5 个视图:
1. main-view       - 主界面（需求输入、模型选择、开始讨论）
2. discussion-view - 讨论过程界面
3. config-view    - API 配置界面
4. history-view   - 历史记录界面
5. document-view  - 文档预览界面
```

### 状态管理 (shared/state.js)
```javascript
state = {
  currentView: 'main',
  currentDiscussion: null,  // 当前讨论
  isDiscussing: false,       // 是否正在讨论
  messages: [],              // 消息列表
  projects: [],              // 项目列表
  currentProjectId: null     // 当前项目
}
```

### 讨论流程
1. 用户填写需求 → 点击开始讨论
2. 创建 currentDiscussion 对象
3. 切换到 discussion-view
4. 讨论过程中消息存储在 messages 和 currentDiscussion.messages
5. 点击返回 → 切换到 main-view，currentDiscussion 保留在内存
6. 点击"生成文档" → 保存到项目 → 可查看文档

## 4. 推荐方案

### 设计方案：渐进式入口

在主界面添加"此项目的讨论"区域：
- 显示当前进行中的讨论（可继续）
- 显示已完成的历史讨论

### 交互设计
| 场景 | 行为 |
|------|------|
| 讨论进行中返回 | 主界面显示"继续讨论"入口，点击回到讨论 |
| 讨论未保存 | 显示"进行中"标签，可继续或放弃 |
| 讨论已保存 | 显示在项目讨论列表中 |
| 新建讨论 | 清空入口，开始新讨论 |

## 5. 技术实现分析

### 需要修改的文件
| 文件 | 改动 |
|------|------|
| `sidebar/sidebar.html` | 添加讨论列表区域 UI |
| `sidebar/sidebar.js` | 添加讨论列表渲染和交互逻辑 |
| `styles/main.css` | 添加讨论列表样式 |
| `shared/state.js` | 已有 projects 结构，无需大改 |

### 关键逻辑
1. 主界面加载时，检查 currentDiscussion 是否存在
2. 如果存在，显示"继续讨论"入口
3. 讨论保存后，从 currentDiscussion 移动到项目讨论列表
4. 点击讨论列表项可查看详情或继续

## 6. 风险评估

| 风险 | 描述 | 应对措施 |
|------|------|---------|
| 状态丢失 | 页面刷新后 currentDiscussion 丢失 | 使用 chrome.storage 持久化 |
| 数据一致 | currentDiscussion 和项目列表数据同步 | 统一保存逻辑 |
