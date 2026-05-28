import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = async () => {
    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    // 先更新 UI，再发请求
    setMessages(newMessages);
    setInput("");

    //发给后端
    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    // 读取流——一个个数据块读
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let hasAssistantMessage = false;
    // buffer 用来拼接不完整的行。网络传输时一行数据可能被切成两块到达，
    // 先拼到 buffer 里，等拿到完整的一行再处理
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 1. 新到的二进制数据转成字符串，拼到 buffer 末尾
      buffer += decoder.decode(value);

      // 2. 按换行符切分 buffer，最后一段可能不完整，留在 buffer 里
      //    ["完整行1", "完整行2", "不完整行..."] → pop 拿最后一个
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      // 3. 处理所有完整的行
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const sseData = line.slice(6);
        if (sseData === "[DONE]") continue;

        const sseEvent = JSON.parse(sseData);
        const delta = sseEvent.choices[0].delta.content;
        if (!delta) continue;

        if (!hasAssistantMessage) {
          hasAssistantMessage = true;
          setMessages((prev) => [...prev, { role: "assistant", content: delta }]);
        } else {
          setMessages((prev) => {
            const nextMessages = [...prev];
            nextMessages[nextMessages.length - 1] = {
              ...nextMessages[nextMessages.length - 1],
              content: nextMessages[nextMessages.length - 1].content + delta,
            };
            return nextMessages;
          });
        }
      }
    }
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button onClick={handleSend}>发</button>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>{msg.content}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
