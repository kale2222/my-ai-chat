import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useChat } from "./ChatContext";

// ReactMarkdown 自定义渲染：检测代码块 → 交给 SyntaxHighlighter 着色
const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    // fenced code block（```lang）→ SyntaxHighlighter
    if (match) {
      return (
        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    }
    // inline code（`code`）→ 普通 <code>
    return <code className={className} {...props}>{children}</code>;
  },
};

function App() {
  const {
    messages,
    isLoading,
    handleSend,
    handleStop,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
  } = useChat();

  const [input, setInput] = useState("");

  // 智能滚动
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef(false);

  const onSend = () => {
    handleSend(input);
    setInput("");
  };

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    if (userScrolledUpRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    userScrolledUpRef.current = !isAtBottom;
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 侧边栏：对话列表 */}
      <div
        style={{
          width: 200,
          borderRight: "1px solid #ccc",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button onClick={createNewSession} disabled={isLoading}>
          新建对话
        </button>
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => !isLoading && switchSession(s.id)}
            style={{
              padding: "8px 12px",
              cursor: isLoading ? "not-allowed" : "pointer",
              background:
                s.id === currentSessionId ? "#e0e0e0" : "transparent",
              borderRadius: 6,
              opacity: isLoading && s.id !== currentSessionId ? 0.5 : 1,
            }}
          >
            {s.title}
          </div>
        ))}
      </div>

      {/* 主区域：消息 + 输入 */}
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", padding: 8 }}
      >
        <div
          ref={messagesRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: "auto", marginBottom: 8 }}
        >
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "assistant" ? (
                <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          ))}
          {isLoading && <div>AI 正在思考...</div>}
        </div>

        <div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />
          <button onClick={onSend}>发</button>
          {isLoading && <button onClick={handleStop}>停止</button>}
        </div>
      </div>
    </div>
  );
}

export default App;
