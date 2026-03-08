# Plan: 把弹窗改为侧边栏模式

## 目标

将 AI 讨论助手的弹窗模式改为侧边栏模式，提供更持久的交互体验。

## 关键决策点

### 决策 1: 是否保留弹窗作为备选
- 选项 A: 只保留侧边栏，移除弹窗代码（已确认）
- 选项 B: 同时保留弹窗和侧边栏，用户点击图标时打开侧边栏
- 确认结果: 选项 A

### 决策 2: 侧边栏宽度策略
- 选项 A: 固定宽度 400px（与弹窗一致）
- 选项 B: 可变宽度 min-width: 320px, max-width: 600px（已确认）
- 确认结果: 选项 B

### 决策 3: 代码复用方式
- 选项 A: 复制 popup 文件为 sidebar 文件（已确认）
- 选项 B: 抽离共享组件，popup 和 sidebar 复用（需要重构）
- 确认结果: 选项 A

## 实现步骤

### Phase 1: 配置修改
- [ ] 修改 manifest.json 添加 sidePanel 权限和配置
- [ ] 修改 background.js 添加 setPanelBehavior

### Phase 2: 创建侧边栏文件
- [ ] 创建 sidebar/ 目录
- [ ] 复制 popup.html 为 sidebar.html
- [ ] 复制 popup.js 为 sidebar.js
- [ ] 复制 shared 文件 (components.js, state.js, utils.js)

### Phase 3: 适配侧边栏
- [ ] 修改 main.css 移除固定宽度，添加响应式布局
- [ ] 修改 sidebar.js 适配侧边栏环境

### Phase 4: 测试验证
- [ ] 测试侧边栏打开和关闭
- [ ] 测试所有功能正常工作

## 风险评估

- 风险 1: Chrome 114 以下版本不支持 sidePanel → 文档说明最低版本要求
- 风险 2: 布局在可变宽度下显示异常 → 使用响应式 CSS 应对
