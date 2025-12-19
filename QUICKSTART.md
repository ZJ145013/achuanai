# 快速开始指南

## 前置要求

- Deno 2.0+ (已安装)
- curl (用于测试 API)
- 后端 JWT token (从 `ACHUAN_JWT` 环境变量获取)

## 本地开发

### 1. 启动开发服务器

```bash
cd c:\Users\19166\Desktop\projects\achuan
deno task dev
```

服务器将在 `http://localhost:8000` 启动

### 2. 测试 API

#### 方式 A: 使用 Bash 脚本 (Git Bash)

```bash
./test.sh
```

#### 方式 B: 使用 Windows 批处理脚本

```cmd
test.bat
```

#### 方式 C: 手动测试

**获取模型列表：**
```bash
curl http://localhost:8000/v1/models
```

**流式聊天：**
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-session-id: 123456" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": true
  }'
```

**非流式聊天：**
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": false
  }'
```

## 环境变量配置

### 本地开发

编辑 `.env` 文件：

```env
ACHUAN_JWT=your_jwt_token_here
ACHUAN_API_URL=https://ai.achuanai.cn/api/chat/completions
```

### Deno Deploy

在项目设置中添加环境变量：

1. 访问 https://dash.deno.com
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 添加：
   - `ACHUAN_JWT`: 你的 JWT token
   - `ACHUAN_API_URL`: (可选) 后端 API 地址

## 支持的模型

- `claude-sonnet-4-5-20250929`
- `gemini-3-pro-preview`
- `gemini-3-pro-preview-image`
- `gpt-5.1-high`

## Session 管理

### 传入 Session ID

**方式 1: 通过 Header**
```bash
curl -H "x-session-id: 123456" ...
```

**方式 2: 通过请求体**
```json
{
  "model": "...",
  "messages": [...],
  "metadata": {
    "sessionId": 123456
  }
}
```

**方式 3: 通过 user 字段**
```json
{
  "model": "...",
  "messages": [...],
  "user": "user@example.com"
}
```

### 获取生成的 Session ID

如果未提供 Session ID，服务器会生成一个并在响应 header 中返回：

```bash
curl -i -X POST http://localhost:8000/v1/chat/completions ...
# 响应 header 中包含：
# x-session-id: 1234567890
```

## 常见问题

### Q: 缺少 `ACHUAN_JWT` 环境变量

**A:** 确保 `.env` 文件存在且包含有效的 JWT token。

### Q: 后端连接失败

**A:** 检查：
1. 后端 API 地址是否正确
2. JWT token 是否有效
3. 网络连接是否正常

### Q: 流式响应中断

**A:** 这可能是网络问题或客户端断开连接。检查网络连接状态。

## 下一步

- 查看 [README.md](README.md) 了解完整的 API 文档
- 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 了解部署指南
- 查看 [src/](src/) 目录了解代码结构
