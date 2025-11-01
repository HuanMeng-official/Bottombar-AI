# Bottombar AI

适用于 Microsoft Edge 移动版的 AI 对话浏览器扩展。

## 功能

- **AI 对话**：通过弹窗界面与 AI 模型进行实时对话
- **流式输出**：支持实时流式响应，提供更好的用户体验
- **Markdown 渲染**：AI 回复支持 Markdown 格式渲染，包括代码块、表格、列表等
- **可配置设置**：用户可以自定义 API 端点、模型参数、系统提示词等

## 技术栈

- **浏览器扩展**：基于 Chrome Extension Manifest V3 规范
- **前端技术**：HTML5 + CSS3 + 原生 JavaScript
- **API 集成**：兼容 OpenAI API 格式的聊天完成接口
- **Markdown 解析**：使用 marked.js 库渲染 AI 回复

## 安装

1. 下载或克隆此项目
2. 打开 Microsoft Edge 浏览器
3. 进入 `edge://extensions/` 页面
4. 开启"开发者模式"
5. 点击"加载解压缩的扩展"，选择项目文件夹

## 配置

首次使用需要在设置中配置：

- **API 端点**：默认 `https://api.openai.com/v1/chat/completions`
- **API 密钥**：必填，用于身份验证
- **模型**：默认 `gpt-3.5-turbo`
- **温度**：范围 0-2，默认 0.5
- **系统提示词**：默认 "You are a helpful assistant."

## 使用

1. 点击浏览器工具栏中的 Bottombar AI 图标
2. 在输入框中输入问题或对话内容
3. 按 Enter 键发送消息
4. 等待 AI 流式回复
5. 可随时点击"停止生成"按钮中断回复

## 项目结构

```
Bottombar AI/
├── manifest.json          # 扩展配置文件
├── popup.html            # 主界面 HTML 结构
├── popup.js              # 主要业务逻辑
├── popup.css             # iOS 风格样式表
├── lib/
│   └── marked.umd.js     # Markdown 解析库
└── icons/
    ├── icon16.png        # 16x16 图标
    ├── icon48.png        # 48x48 图标
    └── icon128.png       # 128x128 图标
```

## 注意事项

- 需要有效的 API 密钥才能使用
- 仅支持兼容 OpenAI API 格式的接口
- 专为移动端 Edge 浏览器优化，桌面端体验可能不同
- 所有设置数据存储在浏览器本地

## 引用外部项目
- [Marked.js](https://github.com/markedjs/marked)：Markdown渲染

## 许可证

MIT License