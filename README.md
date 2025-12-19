# OpenAI 兼容 API 包装层

将现有聊天 API 封装为 OpenAI 兼容接口，支持 Deno Deploy 部署。

## 功能

- `GET /v1/models` - 返回支持的模型列表
- `POST /v1/chat/completions` - 聊天完成端点（支持流式和非流式）

## 支持的模型

- `claude-sonnet-4-5-20250929`
- `gemini-3-pro-preview`
- `gemini-3-pro-preview-image`
- `gpt-5.1-high`

## 环境变量

- `ACHUAN_JWT` (必填) - 后端 Authorization JWT token
- `ACHUAN_API_URL` (可选) - 后端 API 地址，默认 `https://ai.achuanai.cn/api/chat/completions`

## 本地开发

```bash
# 安装 Deno (https://deno.land)

# 开发模式（自动重启）
deno task dev

# 生产模式
deno task start
```

## 部署到 Deno Deploy

1. 推送代码到 GitHub
2. 在 Deno Deploy 连接 GitHub 仓库
3. 设置环境变量 `ACHUAN_JWT`
4. 部署

## API 使用示例

### 获取模型列表

```bash
curl http://localhost:8000/v1/models
```

### 流式聊天

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### 非流式聊天

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

## Session 管理

- 通过 `x-session-id` header 传入 sessionId（可选）
- 或通过 `metadata.sessionId` 在请求体中传入
- 若未提供，服务器会生成一个随机 sessionId 并在响应 header 中返回

## 错误处理

所有错误返回 OpenAI 兼容的错误格式：

```json
{
  "error": {
    "message": "...",
    "type": "invalid_request_error",
    "code": "..."
  }
}
```
