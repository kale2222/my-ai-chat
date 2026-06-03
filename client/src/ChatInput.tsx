import { useState } from "react";
import { useChat } from "./ChatContext";

/*
  输入框 + 发送/停止按钮

  关注点：
    - input 是当前输入框的文本，只在本组件里用 → 用 useState，不放 Context
    - 发送：调 ChatContext 的 handleSend，然后清空输入框
    - 回车键：触发发送
    - AI 生成中：才显示"停止"按钮（点击调 handleStop 中断）
*/
function ChatInput() {
  const { isLoading, handleSend, handleStop } = useChat();
  const [input, setInput] = useState("");

  const onSend = () => {
    handleSend(input);
    setInput("");
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        // 回车发送，e.key === "Enter" && onSend() 用短路求值简化 if
        onKeyDown={(e) => e.key === "Enter" && onSend()}
      />
      <button onClick={onSend}>发</button>
      {isLoading && <button onClick={handleStop}>停止</button>}
    </div>
  );
}

export default ChatInput;
