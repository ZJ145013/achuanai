# Deno Deploy 部署指南

## 快速开始

### 1. 本地开发

```bash
# 安装 Deno (如未安装)
# https://deno.land

# 开发模式（自动重启）
deno task dev

# 服务器将在 http://localhost:8000 启动
```

### 2. 测试 API

#### 获取模型列表
```bash
curl http://localhost:8000/v1/models
```

#### 流式聊天
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

#### 非流式聊天
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

### 3. 部署到 Deno Deploy

#### 方式 A: 通过 GitHub（推荐）

1. **推送代码到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: OpenAI wrapper"
   git remote add origin https://github.com/YOUR_USERNAME/achuan.git
   git push -u origin main
   ```

2. **在 Deno Deploy 连接 GitHub**
   - 访问 https://dash.deno.com
   - 点击 "New Project"
   - 选择 GitHub 仓库
   - 选择 `main.ts` 作为入口文件

3. **配置环境变量**
   - 在 Deno Deploy 项目设置中添加：
     - `ACHUAN_JWT`: 你的后端 JWT token
     - `ACHUAN_API_URL`: (可选) 后端 API 地址

4. **部署**
   - 每次推送到 main 分支时自动部署

#### 方式 B: 手动部署

1. **安装 deployctl**
   ```bash
   deno install -A --no-check https://deno.land/x/deployctl/deployctl.ts
   ```

2. **部署**
   ```bash
   deployctl deploy --project=your-project-name main.ts
   ```

## 环境变量配置

### 必填
- `ACHUAN_JWT` - 后端 Authorization JWT token

### 可选
- `ACHUAN_API_URL` - 后端 API 地址（默认：`https://ai.achuanai.cn/api/chat/completions`）

## 架构说明

### 文件结构
```
achuan/
├── main.ts              # 入口文件
├── deno.json            # Deno 配置
├── README.md            # 使用说明
├── DEPLOYMENT.md        # 部署指南
└── src/
    ├── router.ts        # 路由处理
    ├── backend.ts       # 后端 API 调用
    ├── session.ts       # Session 管理
    ├── openai.ts        # OpenAI 兼容层
    └── models.ts        # 模型定义
```

### 核心流程

1. **请求接收** → `router.ts`
2. **模型校验** → `models.ts`
3. **请求转换** → `openai.ts` + `session.ts`
4. **后端调用** → `backend.ts`
5. **响应转换** → SSE 流式转发或 JSON 返回

## 支持的模型

- `claude-sonnet-4-5-20250929`
- `gemini-3-pro-preview`
- `gemini-3-pro-preview-image`
- `gpt-5.1-high`

## Session 管理

### 传入 Session ID 的方式

1. **通过 Header**
   ```bash
   curl -H "x-session-id: 123456" ...
   ```

2. **通过请求体**
   ```json
   {
     "model": "...",
     "messages": [...],
     "metadata": {
       "sessionId": 123456
     }
   }
   ```

3. **通过 user 字段**
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

## 错误处理

所有错误返回 OpenAI 兼容格式：

```json
{
  "error": {
    "message": "错误描述",
    "type": "invalid_request_error",
    "code": "error_code"
  }
}
```

### 常见错误

| 状态码 | 错误 | 原因 |
|--------|------|------|
| 400 | invalid_request_error | 请求格式错误或模型不支持 |
| 502 | backend_error | 后端 API 错误 |
| 500 | internal_error | 服务器内部错误 |

## 性能优化

### 流式响应
- 使用 `stream: true` 获得实时响应
- 适合长文本生成场景

### 非流式响应
- 使用 `stream: false` 获得完整响应
- 适合需要完整结果的场景

## 监控和日志

### 本地开发
```bash
# 启用详细日志
RUST_LOG=debug deno task dev
```

### Deno Deploy
- 在 Deno Deploy 仪表板查看日志
- 监控请求数、错误率、响应时间

## 故障排除

### 问题：`ACHUAN_JWT` 环境变量缺失
**解决方案**：在 Deno Deploy 项目设置中添加环境变量

### 问题：后端连接超时
**解决方案**：检查后端 API 地址和网络连接

### 问题：流式响应中断
**解决方案**：检查客户端连接状态，可能是网络问题

## 生产部署检查清单

- [ ] 环境变量已配置
- [ ] 后端 JWT token 有效
- [ ] 后端 API 地址正确
- [ ] 已测试所有支持的模型
- [ ] 已测试流式和非流式响应
- [ ] 已测试错误处理
- [ ] 已配置监控和告警
- [ ] 已备份配置信息

## 支持

如有问题，请检查：
1. 环境变量配置
2. 后端 API 连接
3. JWT token 有效性
4. 网络连接状态
