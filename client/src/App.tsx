import { useState, useRef, useEffect } from "react";
import { useChat } from "./ChatContext";

function App() {
  const { messages, isLoading, handleSend, handleStop } = useChat();

  // input 是 UI 状态，只在这一层用，所以留在 App
  const [input, setInput] = useState("");

  // 智能滚动
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef(false);

  const onSend = () => {
    handleSend(input);
    setInput("");
  };

  // messages 变化 → DOM 更新后，检查是否需要自动滚底
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    if (userScrolledUpRef.current) return;

    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // 用户手动上翻时记住状态
  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    userScrolledUpRef.current = !isAtBottom;
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
      />
      <button onClick={onSend}>发</button>
      {isLoading && <button onClick={handleStop}>停止</button>}
      <div
        ref={messagesRef}
        onScroll={handleScroll}
        style={{ height: '400px', overflowY: 'auto' }}
      >
        {messages.map((msg, i) => (
          <div key={i}>{msg.content}</div>
        ))}
        {isLoading && <div>AI 正在思考...</div>}
      </div>
    </div>
  );
}

export default App;
