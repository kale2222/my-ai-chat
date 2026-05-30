import "dotenv/config";
import http from "node:http";

const API_KEY = process.env.DEEPSEEK_API_KEY || "";

const server = http.createServer((req, res) => {
  // CORS —— 允许跨域
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // OPTIONS 预检请求 —— 直接放行
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 健康检查
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // 聊天接口 —— 转发给 DeepSeek
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { messages } = JSON.parse(body);

        // 转发给 DeepSeek API（stream: true = 流式）
        const deepseekResponse = await fetch(
          "https://api.deepseek.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages,
              stream: true, // 流式：DeepSeek 边生成边发
            }),
          }
        );

        // 通知前端：我要开始发流式数据了
        res.writeHead(200, { "Content-Type": "text/event-stream" });

        // 逐块读取 DeepSeek 的流，原封不动转发给前端
        for await (const chunk of deepseekResponse.body) {
          res.write(chunk); // 每次收到一块就转发，不等待
          console.log("收到块:", new TextDecoder().decode(chunk, { stream: true }));
        }

        res.end(); // 流结束了
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  // 其他请求返回 404
  res.writeHead(404);
  res.end("Not Found");
});

server.listen(3001, () => {
  console.log("http://localhost:3001");
});
