# Todo: 实时显示功能

## Phase 1: 基础架构
- [ ] 1.1 修改 manifest.json，添加 tabs 权限
- [ ] 1.2 创建 discuss/discuss.html 基础结构
- [ ] 1.3 创建 discuss/discuss.js 框架

## Phase 2: 后台到页面通信
- [ ] 2.1 在 background.js 中添加讨论状态管理（存储到 chrome.storage）
- [ ] 2.2 实现页面通过 URL 参数获取讨论 ID
- [ ] 2.3 页面加载时从 storage 拉取状态

## Phase 3: 实时显示逻辑
- [ ] 3.1 修改 sidebar 添加运行模式选择（复选框）
- [ ] 3.2 实现打开实时页面的逻辑
- [ ] 3.3 实现消息实时渲染

## Phase 4: UI 完善
- [ ] 4.1 设计并实现实时显示页面样式（全屏卡片布局）
- [ ] 4.2 添加模型状态指示器（等待中/思考中/已完成/错误）
- [ ] 4.3 添加讨论进度显示
