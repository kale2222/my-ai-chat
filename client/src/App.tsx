import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

/*
  顶层布局：
    ┌──────────┬──────────────────────┐
    │ Sidebar  │  MessageList         │
    │ 会话列表  │  消息（虚拟列表）     │
    │          ├──────────────────────┤
    │          │  ChatInput 输入框    │
    └──────────┴──────────────────────┘

  App 只搭骨架，不持有任何状态。
  数据从 ChatContext 来 —— 各组件自己 useChat() 取自己需要的部分。
*/
function App() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 8,
        }}
      >
        <MessageList />
        <ChatInput />
      </div>
    </div>
  );
}

export default App;
