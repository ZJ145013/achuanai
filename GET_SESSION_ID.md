# 获取有效的 Session ID 指南

## 方法 1: 使用脚本自动创建会话

### Bash 脚本 (Git Bash)

```bash
./create-session.sh
```

### Windows 批处理脚本

```cmd
create-session.bat
```

这两个脚本会自动调用后端的 `/api/chat/session` 端点创建新会话，并返回有效的 sessionId。

## 方法 2: 手动创建会话

### 步骤 1: 创建新会话

```bash
curl -X POST https://ai.achuanai.cn/api/chat/session \
  -H "Content-Type: application/json" \
  -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIyNDQ3LCJzaWduIjoiOTNlMTU4YjgwODVjNTBjY2QwZTg5NmVmOWNkNDQxNjIiLCJyb2xlIjoidXNlciIsImV4cCI6MTc2Nzk0NjMwOCwibmJmIjoxNzY1MjY3OTA4LCJpYXQiOjE3NjUyNjc5MDh9.1vRGCxVChgomww31hp5XrpIhUlB5pM9fZPBMm8KxPCI" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "plugins": [],
    "mcp": []
  }'
```

### 步骤 2: 从响应中提取 sessionId

响应格式如下：

```json
{
  "code": 0,
  "data": {
    "id": 296270,
    "created": "2025-12-19 10:24:21",
    "uid": 22447,
    "model": "claude-sonnet-4-5-20250929",
    ...
  },
  "msg": ""
}
```

从 `data.id` 字段获取 sessionId（例如：`296270`）

## 方法 3: 使用现有的有效 sessionId

如果你已经有一个有效的 sessionId（例如从之前的会话中获得），可以直接使用它。

## 使用 sessionId 进行 API 调用

### 方式 1: 通过 Header 传入

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-session-id: 296270" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": true
  }'
```

### 方式 2: 通过请求体传入

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": false,
    "metadata": {
      "sessionId": 296270
    }
  }'
```

### 方式 3: 通过 user 字段传入

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": false,
    "user": "user@example.com"
  }'
```

## 完整测试流程

### 1. 创建会话并获取 sessionId

```bash
./create-session.sh
# 输出: Session ID: 296270
```

### 2. 使用 sessionId 进行流式聊天

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-session-id: 296270" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "What is 2+2?"}
    ],
    "stream": true
  }'
```

### 3. 继续对话（使用相同的 sessionId）

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-session-id: 296270" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "What is 3+3?"}
    ],
    "stream": true
  }'
```

## 常见问题

### Q: 如何知道 sessionId 是否有效？

**A:** 如果 sessionId 有效，API 会返回来自后端的实际响应。如果无效，会返回错误信息 `"对话不存在"`。

### Q: 可以重复使用同一个 sessionId 吗？

**A:** 是的，可以。使用相同的 sessionId 进行多次请求会保持对话上下文。

### Q: sessionId 会过期吗？

**A:** 这取决于后端的实现。通常会话会在一段时间后过期。如果收到 `"对话不存在"` 错误，需要创建新的会话。

### Q: 如何在脚本中自动提取 sessionId？

**A:** 使用 `grep` 或 `jq` 提取 JSON 中的 `id` 字段：

```bash
SESSION_ID=$(curl -s -X POST https://ai.achuanai.cn/api/chat/session \
  -H "Content-Type: application/json" \
  -H "Authorization: $ACHUAN_JWT" \
  -d '{"model":"claude-sonnet-4-5-20250929","plugins":[],"mcp":[]}' | \
  grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

echo "Session ID: $SESSION_ID"
```

## 下一步

1. 运行 `./create-session.sh` 或 `create-session.bat` 创建新会话
2. 获取返回的 sessionId
3. 使用该 sessionId 进行 API 调用
4. 验证流式和非流式响应都能正常工作
