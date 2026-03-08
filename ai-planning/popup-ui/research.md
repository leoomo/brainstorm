# Research: popup-ui

## 项目概述

这是一个 Chrome Extension (Manifest V3) "AI 讨论助手"，用于通过多模型 AI 讨论生成产品文档。

## 文件结构

```
brainstorm_chat/
├── manifest.json          # Extension manifest (MV3)
├── popup/
│   ├── popup.html         # Main popup UI (6 views)
│   └── popup.js           # UI logic & state management (750+ lines)
├── background/
│   └── background.js      # Service worker - API calls & discussion logic
├── styles/
│   └── main.css           # All styles (700+ lines)
└── icons/
    └── icon.svg           # Extension icon
```

## UI 组件层级

### 6 个视图 (popup.html):
1. **Main View** (`#main-view`) - 主要输入界面
2. **Discussion View** (`#discussion-view`) - 实时讨论显示
3. **Config View** (`#config-view`) - API 配置管理
4. **History View** (`#history-view`) - 历史记录
5. **Document View** (`#document-view`) - 生成的文档
6. **Config Modal** (`#config-modal`) - 添加/编辑模型配置

### 组件结构:
```
body (400x520px fixed)
└── #app
    └── .view.active
        ├── .header (h1/h2 + .btn)
        ├── .main-content
        │   ├── .form-group
        │   ├── .mode-selector
        │   ├── .model-list
        │   ├── .messages
        │   └── .markdown-content
        └── .footer (.btn)
```

## 设计系统

### CSS 变量 (`:root`):
- **Primary Color**: `#0EA5E9` (专业蓝)
- **Background**: `#F8FAFC`
- **Card Background**: `#FFFFFF`
- **Text Colors**: 3级层次 (`#0F172A`, `#64748B`, `#94A3B8`)
- **Functional Colors**: Success (`#10B981`), Danger (`#EF4444`), Warning (`#F59E0B`)
- **Border Radius**: 6px/10px/14px (sm/md/lg)
- **Shadows**: 3级深度
- **Transition**: `0.2s cubic-bezier(0.4, 0, 0.2, 1)`

### 设计模式:
- Flexbox 布局
- 自定义 checkbox/radio
- Hover 状态 + transform + shadow
- CSS 动画: fadeIn, slideUp, pulse, toastIn, spin
- 自定义滚动条

## 潜在问题

### 设计/UX 问题:
1. **固定 400x520px** - 复杂讨论时可能显得拥挤
2. **无真正流式显示** - 消息一次性显示（非逐字符流式）
3. **模型选择反馈不足** - 无选中数量视觉提示
4. **无进度指示器** - API 调用期间无加载动画
5. **Document view** - 使用 `<pre>` 而非 proper Markdown 渲染
6. **无错误边界** - API 失败可能崩溃 UI

### 功能问题:
1. **MessagePort 连接不稳定**
2. **重复函数定义** - `getModeDefined` 定义两次
3. **API 无验证** - 密钥明文存储
4. **硬编码 max rounds** - `maxRounds: 3` 不可配置
5. **无模型温度/max_tokens 设置**
6. **Continue Discussion 逻辑混乱**

### 架构问题:
1. **无防抖** - 每次按键都验证
2. **DOM 操作** - 使用 innerHTML（虽有 escapeHtml）
3. **全局状态** - 单一大型状态对象
4. **无 TypeScript** - 无类型安全
