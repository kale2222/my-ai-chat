# AI Chat

一个从零开始的 AI 对话项目，逐版本迭代。

## 技术栈

- 前端：React 18 + Vite + TypeScript
- 后端：Node.js（原生 http 模块）
- AI：DeepSeek API（OpenAI 兼容）
- 核心库：react-virtuoso（虚拟列表）、react-markdown、react-syntax-highlighter
- 样式：内联 CSS

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

**V2.4** 流式拼接渲染，逐字显示。每次请求携带完整消息历史，支持多轮对话

### V3 — 体验优化

**V3.1** loading 状态：发送后显示"AI 正在思考..."

**V3.2** 中断生成：AbortController + 停止按钮

**V3.3** 双缓冲：每 50ms 取固定字符数渲染，输出匀速

**V3.4** 智能滚动：自动滚底 + 用户上翻时暂停

### V4 — 会话管理

**V4.1** 状态抽入 Context

**V4.2** sessions 数组支持多个对话

**V4.3** 侧边栏切换对话

**V4.4** localStorage 持久化

### V5 — 富文本

**V5.1** ReactMarkdown 渲染 AI 回复（加粗、列表、代码块等）

**V5.2** react-syntax-highlighter + Prism oneDark 主题代码高亮

### V6 — 虚拟列表 + 组件化

**V6.1** 集成 react-virtuoso：只渲染可视区域消息，DOM 节点稳定在 ~20 个

**V6.2** 智能滚动迁移到 Virtuoso API：requestAnimationFrame + 长度增长检测
- 新消息出现 → 强制滚底（用户即使在看历史也跟过去）
- AI 流式增长 → 尊重用户上翻状态

**V6.3** 组件化拆分：App 只搭骨架，Sidebar / MessageList / ChatInput 各自管理本地状态

**V6.4** 体验细节
- 发送时一次性插入用户消息 + AI 空占位，消除"插入新消息"跳动
- 用户消息右对齐蓝底，AI 消息左对齐灰底
- 空对话状态显示引导文案
