import { useChat } from "./ChatContext";

/*
  侧边栏：新建对话 + 历史会话列表

  做了三件事：
    1. 「新建对话」按钮 → 调 createNewSession
    2. 遍历 sessions 渲染历史会话 → 点击切换 switchSession
    3. AI 生成中 (isLoading=true) 禁用所有操作
       避免切换对话时定时器还在写入旧 messages，造成数据错乱
*/
function Sidebar() {
  const {
    isLoading,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
  } = useChat();

  return (
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
          // 生成中点了不响应；空闲时切换会话
          onClick={() => !isLoading && switchSession(s.id)}
          style={{
            padding: "8px 12px",
            cursor: isLoading ? "not-allowed" : "pointer",
            // 当前会话高亮
            background: s.id === currentSessionId ? "#e0e0e0" : "transparent",
            borderRadius: 6,
            // 生成中：非当前会话半透明，视觉提示「不可点」
            opacity: isLoading && s.id !== currentSessionId ? 0.5 : 1,
          }}
        >
          {s.title}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;
