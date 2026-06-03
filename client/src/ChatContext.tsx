import { createContext, useContext, useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

// 一条会话：id 区分身份，title 用于列表显示，messages 存这条对话的全部消息
type Session = {
  id: string;
  title: string;
  messages: Message[];
};

type ChatContextValue = {
  messages: Message[];
  isLoading: boolean;
  handleSend: (input: string) => Promise<void>;
  handleStop: () => void;
  sessions: Session[];
  currentSessionId: string;
  createNewSession: () => void;
  switchSession: (id: string) => void;
};

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const defaultSessionId = generateId();
const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // useState 的 lazy initializer（传函数）只在组件挂载时执行一次，不影响后续渲染
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem("chat-sessions");
      return saved
        ? JSON.parse(saved)
        : [{ id: defaultSessionId, title: "新对话", messages: [] }];
    } catch {
      return [{ id: defaultSessionId, title: "新对话", messages: [] }];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("chat-current-id");
      // 验证保存的 id 在 sessions 里存在，防止数据损坏
      if (saved && sessions.some((s) => s.id === saved)) return saved;
    } catch {}
    return sessions[0]?.id || defaultSessionId;
  });

  // messages 从当前会话的保存内容初始化，而不是硬编码 []
  const [messages, setMessages] = useState<Message[]>(() => {
    return sessions.find((s) => s.id === currentSessionId)?.messages ?? [];
  });
  const [isLoading, setIsLoading] = useState(false);

  //messages 变化时自动同步回 sessions，保证切换时不丢数据
  useEffect(() => {
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages } : s))
    );
  }, [messages]);

  // sessions 变化 → 500ms 节流存到 localStorage（流式输出时不频繁写入）
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("chat-sessions", JSON.stringify(sessions));
    }, 500);
    return () => clearTimeout(timer);
  }, [sessions]);

  // currentSessionId 变化 → 立即存（用户主动操作，不频繁）
  useEffect(() => {
    localStorage.setItem("chat-current-id", currentSessionId);
  }, [currentSessionId]);

  // useRef 跨渲染共享值，修改不触发 re-render
  const cancelRef = useRef<(() => void) | null>(null);
  const renderBufferRef = useRef("");
  const intervalRef = useRef<number | null>(null);

  const handleStop = () => {
    cancelRef.current?.();
  };

  const handleSend = async (input: string) => {
    const userMessage: Message = { role: "user", content: input };
    // 一次性插入用户消息 + AI 空占位，避免后续插入新消息时 UI 跳动
    // 注意：newMessages 是发给后端的消息（不带空 AI 占位），界面上显示带占位
    const newMessages = [...messages, userMessage];
    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantPlaceholder]);
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
      // 占位消息已经在发送时插入，这里只需要往最后一条追加 chunk
      const CHARS_PER_TICK = 8;
      let streamEnded = false;

      intervalRef.current = window.setInterval(() => {
        if (renderBufferRef.current.length === 0) {
          if (streamEnded) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setIsLoading(false); // 全部输出完才关掉 loading
          }
          return;
        }

        const chunk = renderBufferRef.current.slice(0, CHARS_PER_TICK);
        renderBufferRef.current = renderBufferRef.current.slice(CHARS_PER_TICK);

        setMessages((prev) => {
          if (prev.length === 0) return prev; // 安全守卫：切对话后 prev 可能为空
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
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

  // 创建新对话：先保存当前对话，再生成空的
  const createNewSession = () => {
    const id = generateId();
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages } : s))
    );
    setCurrentSessionId(id);
    setMessages([]);
    setSessions((prev) => [...prev, { id, title: "新对话", messages: [] }]);
  };

  // 切换对话：先保存当前对话，再加载目标对话
  const switchSession = (id: string) => {
    if (id === currentSessionId) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages } : s))
    );
    const target = sessions.find((s) => s.id === id);
    setCurrentSessionId(id);
    setMessages(target?.messages ?? []);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        handleSend,
        handleStop,
        sessions,
        currentSessionId,
        createNewSession,
        switchSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
