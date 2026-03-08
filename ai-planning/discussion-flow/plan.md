# AI 讨论助手 - 讨论流程优化实施计划

## 1. 目标

优化讨论流程，实现无缝继续和查看历史：
- 主界面显示当前项目的讨论列表
- 区分"进行中"和"已完成"的讨论
- 点击可继续进行中的讨论

## 2. 已确认的决策

| 决策项 | 选择 |
|--------|------|
| 进行中讨论的持久化 | 存储在 chrome.storage.local |
| 讨论列表展示位置 | 项目切换器下方 |
| 新建讨论时的行为 | 提示用户选择保留或新建 |

## 3. 实现步骤

### Phase 1: 持久化层
- [ ] 1.1 在 state.js 添加 currentDiscussion 持久化方法
- [ ] 1.2 讨论状态变化时自动保存

### Phase 2: UI 层
- [ ] 2.1 在 sidebar.html 添加讨论列表区域（项目切换器下方）
- [ ] 2.2 在 sidebar.js 添加讨论列表渲染逻辑

### Phase 3: 交互层
- [ ] 3.1 点击继续讨论回到讨论界面
- [ ] 3.2 点击已完成讨论查看文档
- [ ] 3.3 新建讨论时提示用户选择

### Phase 4: 样式优化
- [ ] 4.1 讨论列表样式
- [ ] 4.2 进行中/已完成状态标签样式

## 4. 风险评估

| 风险 | 描述 | 应对措施 |
|------|------|---------|
| 存储限制 | Chrome storage 有大小限制 | 仅保存必要的讨论元数据 |
| 数据一致 | 多处修改 currentDiscussion | 统一通过 StateManager 管理 |

## 5. 文件清单

### 修改文件
- `brainstorm_chat/shared/state.js` - 添加持久化方法
- `brainstorm_chat/sidebar/sidebar.html` - 添加讨论列表 UI
- `brainstorm_chat/sidebar/sidebar.js` - 添加讨论列表逻辑
- `brainstorm_chat/styles/main.css` - 添加样式
