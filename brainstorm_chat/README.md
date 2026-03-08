# AI 讨论助手 - Chrome 插件

## 图标说明

本目录需要以下图标文件：

| 文件名 | 尺寸 | 用途 |
|--------|------|------|
| icon16.png | 16x16 | 工具栏小图标 |
| icon48.png | 48x48 | 工具栏中图标 |
| icon128.png | 128x128 | 插件管理页面图标 |

### 生成图标的方法

1. 使用在线工具生成（如 favicon.io）
2. 使用 ImageMagick：
   ```bash
   convert -size 128x128 xc:#4a90e2 -fill white -gravity center -pointsize 48 -annotate 0 "AI" icon128.png
   ```
3. 手动设计并添加

## 安装插件

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本目录

## 使用说明

1. 点击工具栏的插件图标打开主界面
2. 在「配置」中添加你的 AI API Key
3. 输入产品需求，选择讨论模式
4. 选择参与的 AI 模型
5. 点击「开始讨论」
6. 讨论完成后，点击「生成文档」
7. 可选择「保存到历史」或「导出」
