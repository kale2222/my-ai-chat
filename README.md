# AI Chat

一个从零开始的 AI 对话项目，逐版本迭代。

## 技术栈

- 前端：React 18 + Vite + TypeScript
- 后端：Node.js（原生 http 模块）
- AI：DeepSeek API（OpenAI 兼容）
- 样式：CSS

## 启动

```bash
# 后端（需要先配置 server/.env 里的 DEEPSEEK_API_KEY）
npm run server

# 前端
npm run dev
```

## 迭代日志

### V1 — 最小闭环

**V1.1** 前端静态页面：输入框 + 按钮 + 控制台打印输入

**V1.2** useState 管理 messages，点发送显示用户消息

**V1.3** Node HTTP 服务器 + /health 接口

**V1.4** 前端 fetch 后端，后端原样返回，前后端通信

**V1.5** 后端转发 DeepSeek（stream: false），前端显示 AI 回复

### V2 — 流式输出

**V2.1** 后端 stream: true，逐块转发流

**V2.2** 前端 ReadableStream + getReader 读取流

**V2.3** 解析 SSE：提取 delta.content

**V2.4** 流式拼接渲染，逐字显示

### V3 — 多轮对话

**V3.1** fetch 时发送完整 messages 数组

**V3.2** AI 回复追加到历史，AI 能记住上下文

### V4 — 体验优化

**V4.1** loading 状态：发送后显示"AI 正在思考..."

**V4.2** 中断生成：AbortController + 停止按钮

**V4.3** 双缓冲：每 50ms 取固定字符数渲染，输出匀速

**V4.4** 智能滚动：自动滚底 + 用户上翻时暂停

### V5 — 会话管理

**V5.1** 状态抽入 Context

**V5.2** sessions 数组支持多个对话

**V5.3** 侧边栏切换对话

**V5.4** localStorage 持久化

### V6 — 富文本

**V6.1** ReactMarkdown 渲染 AI 回复

**V6.2** 代码高亮
