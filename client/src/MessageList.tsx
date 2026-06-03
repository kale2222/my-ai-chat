import { useRef, useEffect } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useChat } from "./ChatContext";

/*
  Markdown 自定义渲染规则。

  ReactMarkdown 默认把 ```js ``` 这种代码块也渲染成普通 <code>，
  我们这里覆盖 code 的渲染：
    - 有 language-xxx 类名（fenced code block）→ SyntaxHighlighter 高亮
    - 没有（行内 `code`）→ 普通 <code>

  写在组件外面，避免每次渲染都重新创建对象。
*/
const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    if (match) {
      return (
        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

/*
  消息列表 —— 三件事：
    1. 虚拟列表（Virtuoso）：只渲染可视区域的消息，性能稳定
    2. 智能滚动：消息变化时自动滚底；用户上翻看历史时不抢
    3. 气泡渲染：用户消息右对齐蓝底，AI 消息左对齐灰底 + Markdown
*/
function MessageList() {
  const { messages } = useChat();

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  // 用户是否上翻看历史。true 时流式增长阶段不抢滚动
  const userScrolledUpRef = useRef(false);
  // 上一次 messages 长度，用来区分"新增消息"和"流式更新最后一条"
  const prevLengthRef = useRef(messages.length);

  /*
    自动滚底两种情况：

    1. 长度增加（用户发送 → 一次性 +2，或 AI 占位 → +1）
       这是用户/系统主动行为 → 强制滚，并清除上翻标记
       requestAnimationFrame：等 Virtuoso 测量好新消息再滚

    2. 长度不变但内容变（AI 流式 chunk 在追加最后一条）
       尊重用户：上翻了就不抢，否则跟着滚
  */
  useEffect(() => {
    if (messages.length === 0) return;

    const grew = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (grew) {
      userScrolledUpRef.current = false;
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: "end",
          behavior: "auto",
        });
      });
    } else if (!userScrolledUpRef.current) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: "end",
        behavior: "auto",
      });
    }
  }, [messages]);

  // 空状态：第一次进来 / 新建对话 → 显示引导文案
  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: 18,
        }}
      >
        问点什么吧 👋
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ flex: 1, marginBottom: 8 }}
      data={messages}
      /*
        atBottomStateChange —— Virtuoso 内置回调：
        当"是否在底部"状态变化时触发。
        用户上翻 → atBottom=false → userScrolledUpRef=true
        用户滚回底 → atBottom=true → userScrolledUpRef=false
      */
      atBottomStateChange={(atBottom) => {
        userScrolledUpRef.current = !atBottom;
      }}
      /*
        itemContent —— 每条消息的渲染函数。
        Virtuoso 只会调用可视区域内的索引，其他索引不创建 DOM。
      */
      itemContent={(_, msg) => {
        const isUser = msg.role === "user";
        return (
          // 外层 flex：根据角色决定气泡左右对齐
          <div
            style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              padding: "6px 0",
            }}
          >
            {/* 气泡：用户蓝底白字，AI 灰底黑字 + Markdown 渲染 */}
            <div
              style={{
                maxWidth: "75%",
                padding: "8px 12px",
                borderRadius: 12,
                background: isUser ? "#1677ff" : "#f0f0f0",
                color: isUser ? "#fff" : "#000",
                wordBreak: "break-word",
              }}
            >
              {isUser ? (
                msg.content
              ) : msg.content === "" ? (
                // AI 占位消息还没收到首块 → 显示思考中
                <span style={{ color: "#999" }}>正在思考...</span>
              ) : (
                <ReactMarkdown components={markdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}

export default MessageList;
