# AI 讨论助手 UI 重构 - 技术实现计划

**基于 PRD**: discussion-ui-redesign.md
**确认决策**: 3/3 全部确认

---

## 阶段一：核心状态重构 (Day 1-2)

### Task 1.1: 重构 StateManager
- **文件**: `shared/state.js`
- **修改内容**:
  - 添加 `discussions` 数组取代单讨论
  - 添加 `activeDiscussionId` 当前选中
  - 添加 `panelState` 面板状态
  - 添加 `maxConcurrentDiscussions = 3` 限制
- **验证**: 状态能正确序列化/反序列化

### Task 1.2: 讨论状态机实现
- **文件**: `shared/state.js`
- **新增**:
  - `createDiscussion()` 工厂函数
  - `updateDiscussionProgress()` 进度更新
  - `archiveOldDiscussions()` 保留20个限制
  - `canStartNewDiscussion()` 并发检查

### Task 1.3: Service Worker 消息通道
- **文件**: `background/background.js`
- **新增**:
  - 支持多讨论并行运行
  - 每个讨论独立的消息通道
  - 错误恢复机制

---

## 阶段二：仪表盘界面 (Day 3-4)

### Task 2.1: 主布局重构
- **文件**: `sidebar/sidebar.html`, `sidebar/sidebar.js`
- **修改**:
  - 固定输入区域在顶部
  - 中间滚动的讨论列表区域
  - 底部固定控制面板占位
- **验证**: 布局在各种高度下正常

### Task 2.2: 活跃讨论卡片组件
- **文件**: `shared/components.js` (新增)
- **实现**:
  ```javascript
  class ActiveDiscussionCard extends HTMLElement {
    // 进度条、模型状态网格、操作按钮
  }
  ```
- **样式**: Tailwind CSS，带动画效果

### Task 2.3: 已完成讨论列表
- **文件**: `sidebar/sidebar.js`
- **实现**:
  - 折叠/展开动画
  - 批量删除操作
  - 一键导出功能

---

## 阶段三：底部控制面板 (Day 5-6)

### Task 3.1: 面板容器
- **文件**: `sidebar/sidebar.html`, `sidebar/sidebar.js`
- **实现**:
  - 三种状态: collapsed / expanded / fullscreen
  - 平滑过渡动画
  - 手势支持 (移动端上滑展开)

### Task 3.2: 实时输出流
- **文件**: `sidebar/sidebar.js`
- **实现**:
  - 打字机效果渲染
  - 自动滚动到底部
  - 代码块语法高亮

### Task 3.3: 模型进度网格
- **文件**: `shared/components.js`
- **实现**:
  - 每个模型独立进度条
  - 状态图标动画 (脉冲、旋转)
  - 错误状态提示

---

## 阶段四：通知系统 (Day 7)

### Task 4.1: 浏览器通知
- **文件**: `background/background.js`
- **实现**:
  - 讨论完成时触发
  - 点击通知打开侧边栏
  - 首次启动请求权限

### Task 4.2: 应用内通知
- **文件**: `sidebar/sidebar.js`
- **实现**:
  - Toast 消息组件
  - 自动消失 + 手动关闭
  - 操作按钮支持

---

## 阶段五：测试与优化 (Day 8)

### Task 5.1: 功能测试
- 启动多个讨论验证并发限制
- 断开网络验证错误恢复
- 刷新页面验证状态持久化

### Task 5.2: 性能优化
- 虚拟滚动 (讨论消息 > 100 条)
- 节流更新 (进度条 200ms)
- 内存泄漏检查

### Task 5.3: 响应式适配
- 桌面端: 标准布局
- 平板端: 调整间距
- 移动端: 底部面板全屏抽屉

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `shared/state.js` | 大幅修改 | 支持多讨论状态 |
| `shared/components.js` | 新增 | 可复用组件 |
| `sidebar/sidebar.html` | 修改 | 新布局结构 |
| `sidebar/sidebar.js` | 大幅修改 | 仪表盘逻辑 |
| `sidebar/sidebar.css` | 修改 | 新增动画样式 |
| `background/background.js` | 修改 | 多讨论并行支持 |
| `manifest.json` | 可能修改 | 权限声明 |

---

## 关键代码片段

### 状态结构
```javascript
// shared/state.js
const StateManager = {
  state: {
    discussions: [], // 所有讨论
    activeDiscussionId: null,
    panelState: 'collapsed', // 'collapsed' | 'expanded' | 'fullscreen'
    maxConcurrent: 3
  },

  canStartNew() {
    const running = this.state.discussions.filter(d => d.status === 'running');
    return running.length < this.state.maxConcurrent;
  }
};
```

### 卡片组件
```javascript
// shared/components.js
class DiscussionCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="discussion-card">
        <div class="progress-bar"></div>
        <div class="model-grid"></div>
      </div>
    `;
  }

  updateProgress(value) {
    this.querySelector('.progress-bar').style.width = `${value}%`;
  }
}
```

---

## 风险评估

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 状态迁移兼容性问题 | 中 | 高 | 提供迁移脚本，旧数据自动转换 |
| 多讨论性能问题 | 中 | 中 | 限制并发数，添加节流 |
| 移动端手势冲突 | 低 | 中 | 充分测试，提供替代操作 |

---

**计划完成，等待执行指令**
