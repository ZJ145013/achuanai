# OpenAI 兼容 API 包装层 - 项目总结

## 项目概述

这是一个完整的 OpenAI 兼容 API 包装层，将现有的聊天 API 封装为标准 OpenAI 接口格式。项目采用 Deno + TypeScript 开发，可直接部署到 Deno Deploy。

## 核心功能

### 已实现的端点

- **GET /v1/models** - 返回支持的模型列表
- **POST /v1/chat/completions** - 聊天完成端点（支持流式和非流式）

### 支持的模型

- `claude-sonnet-4-5-20250929`
- `gemini-3-pro-preview`
- `gemini-3-pro-preview-image`
- `gpt-5.1-high`

## 项目结构

```
achuan/
├── main.ts                 # Deno 入口文件（包含 .env 加载）
├── deno.json              # Deno 配置
├── .env                   # 环境变量（包含 JWT token）
├── .env.example           # 环境变量模板
├── .gitignore             # Git 忽略文件
├── README.md              # 完整 API 文档
├── QUICKSTART.md          # 快速开始指南
├── DEPLOYMENT.md          # 详细部署指南
├── GET_SESSION_ID.md      # Session ID 获取指南
├── PROJECT_SUMMARY.md     # 项目总结（本文件）
├── test.sh                # Bash 测试脚本
├── test.bat               # Windows 批处理测试脚本
├── create-session.sh      # 创建会话脚本（Bash）
├── create-session.bat     # 创建会话脚本（Windows）
└── src/
    ├── router.ts          # 路由处理和请求分发
    ├── backend.ts         # 后端 API 调用和 SSE 流处理
    ├── session.ts         # Session ID 管理和生成
    ├── openai.ts          # OpenAI 兼容层和响应格式
    └── models.ts          # 模型定义和验证
```

## 技术架构

### 请求流程

```
OpenAI 客户端请求
    ↓
GET /v1/models 或 POST /v1/chat/completions
    ↓
Router (src/router.ts)
    ├─ 模型验证 (src/models.ts)
    ├─ 请求转换 (src/openai.ts)
    └─ Session 管理 (src/session.ts)
    ↓
后端 API 调用 (src/backend.ts)
    ├─ 请求格式转换
    ├─ JWT 认证
    └─ SSE 流处理
    ↓
OpenAI 兼容响应
```

### 核心特性

1. **OpenAI 兼容** - 完全兼容 OpenAI API 格式
2. **流式响应** - 完整的 SSE (Server-Sent Events) 支持
3. **灵活的 Session 管理** - 支持多种 Session ID 传入方式
4. **生产级错误处理** - OpenAI 兼容的错误格式
5. **无状态设计** - 适配 Deno Deploy 的轻量部署
6. **自动环境变量加载** - 启动时自动从 `.env` 文件加载

## 快速开始

### 1. 启动本地服务器

```bash
deno task dev
```

服务器将在 `http://localhost:8000` 启动

### 2. 获取有效的 Session ID

```bash
./create-session.sh
```

或在 Windows 上：

```cmd
create-session.bat
```

### 3. 测试 API

```bash
./test.sh
```

或在 Windows 上：

```cmd
test.bat
```

## 环境变量配置

### 必填

- `ACHUAN_JWT` - 后端 Authorization JWT token

### 可选

- `ACHUAN_API_URL` - 后端 API 地址（默认：`https://ai.achuanai.cn/api/chat/completions`）

## API 使用示例

### 获取模型列表

```bash
curl http://localhost:8000/v1/models
```

### 流式聊天

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

### 非流式聊天

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

## Session 管理

### 获取有效的 Session ID

1. 运行 `./create-session.sh` 或 `create-session.bat`
2. 从输出中获取 Session ID
3. 在 API 调用中使用该 Session ID

### 传入 Session ID 的方式

**方式 1: 通过 Header**
```bash
-H "x-session-id: 296270"
```

**方式 2: 通过请求体**
```json
{
  "metadata": {
    "sessionId": 296270
  }
}
```

**方式 3: 通过 user 字段**
```json
{
  "user": "user@example.com"
}
```

## 部署到 Deno Deploy

### 步骤 1: 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit: OpenAI wrapper"
git remote add origin https://github.com/YOUR_USERNAME/achuan.git
git push -u origin main
```

### 步骤 2: 在 Deno Deploy 连接 GitHub

1. 访问 https://dash.deno.com
2. 点击 "New Project"
3. 选择 GitHub 仓库
4. 选择 `main.ts` 作为入口文件

### 步骤 3: 配置环境变量

在 Deno Deploy 项目设置中添加：
- `ACHUAN_JWT`: 你的后端 JWT token
- `ACHUAN_API_URL`: (可选) 后端 API 地址

### 步骤 4: 部署

每次推送到 main 分支时自动部署

## 测试结果

### 已验证的功能

✅ **GET /v1/models** - 成功返回模型列表
✅ **POST /v1/chat/completions (stream=true)** - 成功流式响应
✅ **POST /v1/chat/completions (stream=false)** - 成功返回完整响应
✅ **请求验证** - 模型和消息字段验证正常
✅ **错误处理** - 返回 OpenAI 兼容的错误格式
✅ **环境变量加载** - `.env` 文件自动加载
✅ **Session 管理** - 支持多种 Session ID 传入方式

## 文档

- [README.md](README.md) - 完整 API 文档和使用示例
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [DEPLOYMENT.md](DEPLOYMENT.md) - 详细部署指南
- [GET_SESSION_ID.md](GET_SESSION_ID.md) - Session ID 获取指南

## 常见问题

### Q: 如何获取有效的 Session ID？

**A:** 运行 `./create-session.sh` 或 `create-session.bat` 脚本，它会自动调用后端创建新会话并返回 Session ID。

### Q: 如何在 Deno Deploy 上部署？

**A:** 推送代码到 GitHub，在 Deno Deploy 连接仓库，配置环境变量，自动部署完成。

### Q: 支持哪些模型？

**A:** 支持 4 个模型：claude-sonnet-4-5-20250929、gemini-3-pro-preview、gemini-3-pro-preview-image、gpt-5.1-high

### Q: 如何处理流式响应？

**A:** 设置 `stream: true` 即可获得 SSE 格式的流式响应。

### Q: 环境变量如何加载？

**A:** 项目启动时会自动从 `.env` 文件加载环境变量，无需手动配置。

## 下一步

1. 使用 `./create-session.sh` 获取有效的 Session ID
2. 运行 `./test.sh` 验证所有功能
3. 推送代码到 GitHub
4. 在 Deno Deploy 部署
5. 集成到你的应用

## 项目完成状态

✅ 核心功能实现完成
✅ 所有端点已验证
✅ 错误处理已实现
✅ 文档已完成
✅ 测试脚本已创建
✅ 部署指南已提供

项目已完全就绪，可以立即投入使用！
