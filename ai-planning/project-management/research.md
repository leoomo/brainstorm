# AI 讨论助手 - 项目管理功能 Research

## 1. 项目概述

- 项目名称：AI 讨论助手 Chrome 扩展
- 项目路径：`/Users/zen/projects/brainstorm/brainstorm_chat/`
- Manifest：V3

## 2. 现有架构

### 2.1 视图结构

```
sidebar/sidebar.html 包含 5 个视图:
1. main-view       - 主界面（需求输入、模型选择、开始讨论）
2. discussion-view - 讨论过程界面
3. config-view    - API 配置界面
4. history-view   - 历史记录界面
5. document-view  - 文档预览界面
```

### 2.2 状态管理 (shared/state.js)

```javascript
StateManager.state = {
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
  history: []  // 当前：扁平数组
};
```

### 2.3 历史数据结构

```javascript
// 当前历史项结构
{
  id: "disc_xxx",
  title: "需求标题",
  requirement: "需求描述",
  mode: "round-table",
  models: ["DeepSeek", "Claude"],
  finalDoc: "生成的文档内容",
  createdAt: "2026-03-08T10:00:00Z"
}
```

### 2.4 存储机制

- 使用 `chrome.storage.local` 存储
- `apiConfigs` - API 配置数组
- `selectedModels` - 选中的模型
- `history` - 历史记录数组

## 3. UI 现状分析

### 3.1 侧边栏空间特性

- 宽度: min 320px, max 600px
- 高度: min 520px
- 布局: Header + Main + Footer 三段式

### 3.2 当前历史界面

- 简单列表展示
- 显示: 标题、时间、模式、模型数量
- 操作: 查看详情、删除
- 痛点: 无项目分组、无搜索、无多主题管理

## 4. 需求理解

### 4.1 用户痛点

1. 历史讨论无法方便复用 - 只能查看最终文档
2. 多个讨论主题混杂 - 无分组/项目概念
3. 无法快速定位 - 无搜索/筛选功能

### 4.2 目标功能

- 引入**项目**概念
- 项目内可创建多次讨论（迭代）
- 支持: 项目切换、创建、删除、重命名

## 5. 技术实现分析

### 5.1 数据结构设计

```javascript
// 新增: 项目结构
{
  projects: [
    {
      id: "proj_xxx",
      name: "项目名称",
      createdAt: "2026-03-08T10:00:00Z",
      updatedAt: "2026-03-08T14:30:00Z",
      discussions: [
        {
          id: "disc_001",
          requirement: "需求描述",
          mode: "round-table",
          models: ["DeepSeek"],
          finalDoc: "文档内容",
          createdAt: "2026-03-08T10:05:00Z"
        }
      ]
    }
  ],
  currentProjectId: "proj_xxx"
}
```

### 5.2 需要修改的文件

| 文件 | 改动说明 |
|------|---------|
| `shared/state.js` | 添加 projects 数据结构和项目管理方法 |
| `sidebar/sidebar.html` | 添加项目切换器 UI |
| `sidebar/sidebar.js` | 添加项目 CRUD 逻辑 |
| `styles/main.css` | 添加项目相关样式 |

### 5.3 风险评估

| 风险 | 描述 | 应对措施 |
|------|------|---------|
| 数据迁移 | 现有历史数据如何处理 | 兼容旧数据，可选择迁移或保留 |
| 存储容量 | 项目数据增大 | 定期清理旧项目 |
| UI 复杂度 | 侧边栏空间有限 | 采用紧凑行式布局 |

## 6. 文件清单

### 修改文件
- `brainstorm_chat/shared/state.js`
- `brainstorm_chat/sidebar/sidebar.html`
- `brainstorm_chat/sidebar/sidebar.js`
- `brainstorm_chat/styles/main.css`
