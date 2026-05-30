import { createContext, useContext, useState, useRef } from "react";

type Message = { role: "user" | "assistant"; content: string };

type ChatContextValue = {
  messages: Message[];
  isLoading: boolean;
  handleSend: (input: string) => Promise<void>;
  handleStop: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 这些 ref 只在 handleSend / handleStop 内部使用
  const cancelRef = useRef<(() => void) | null>(null);
  const renderBufferRef = useRef("");
  const intervalRef = useRef<number | null>(null);

  const handleStop = () => {
    cancelRef.current?.();
  };

  const handleSend = async (input: string) => {
    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const abortController = new AbortController();
    cancelRef.current = () => abortController.abort();

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortController.signal,
      });

      if (!response.body) return;
      const reader = response.body.getReader();

      cancelRef.current = () => {
        reader.cancel().catch(() => {});
        abortController.abort();
      };

      const decoder = new TextDecoder();

      // ─── 消费者：每 50ms 从 renderBuffer 取 8 个字符渲染 ───
      const CHARS_PER_TICK = 8;
      let streamEnded = false;
      let hasAssistantMessage = false;

      intervalRef.current = window.setInterval(() => {
        if (renderBufferRef.current.length === 0) {
          if (streamEnded) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
          }
          return;
        }

        const chunk = renderBufferRef.current.slice(0, CHARS_PER_TICK);
        renderBufferRef.current = renderBufferRef.current.slice(CHARS_PER_TICK);

        if (!hasAssistantMessage) {
          hasAssistantMessage = true;
          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: chunk },
          ]);
        } else {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + chunk,
            };
            return next;
          });
        }
      }, 50);

      // ─── 生产者：读 SSE 流 → 解析 delta → 写入 renderBuffer ───
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const sseData = line.slice(6);
          if (sseData === "[DONE]") continue;

          const sseEvent = JSON.parse(sseData);
          const delta = sseEvent.choices[0].delta.content;
          if (!delta) continue;

          renderBufferRef.current += delta;
        }
      }

      streamEnded = true;
    } catch (e) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      renderBufferRef.current = "";

      if (e instanceof Error && e.name === "AbortError") return;
      console.error(e);
    } finally {
      setIsLoading(false);
      cancelRef.current = null;
    }
  };

  return (
    <ChatContext.Provider value={{ messages, isLoading, handleSend, handleStop }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
