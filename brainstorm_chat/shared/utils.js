// AI 讨论助手 - 工具函数模块

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 获取提供商显示名称
function getProviderName(provider) {
  const providers = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic (Claude)',
    'deepseek': 'DeepSeek',
    'qwen': '通义千问 (阿里)',
    'ernie': '文心一言 (百度)',
    'glm': 'GLM (智谱)',
    'moonshot': 'Moonshot (Kimi)',
    'custom': '自定义'
  };
  return providers[provider] || provider;
}

// 获取模式显示名称
function getModeName(mode) {
  const modes = {
    'round-table': '圆桌会议',
    'brainstorm': '头脑风暴',
    'debate': '辩论评审'
  };
  return modes[mode] || mode;
}

// 下载文件
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 格式化日期
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  // 小于 1 分钟
  if (diff < 60000) return '刚刚';
  // 小于 1 小时
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  // 小于 1 天
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  // 小于 7 天
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';

  // 超过 7 天
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 导出模块
window.Utils = {
  generateId,
  escapeHtml,
  getProviderName,
  getModeName,
  downloadFile,
  formatDate
};
