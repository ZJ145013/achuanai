export type OpenAIChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: string; content: unknown };

export type OpenAIChatCompletionsRequest = {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  user?: string;
  metadata?: Record<string, unknown>;
};

export function json(status: number, body: unknown, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(extraHeaders ?? {}),
    },
  });
}

export function openAIError(status: number, message: string, code = "invalid_request_error") {
  return json(status, { error: { message, type: "invalid_request_error", code } });
}

export function asTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  // 支持多模态消息格式: [{ type: "text", text: "..." }, { type: "image_url", ... }]
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { type: "text"; text: string } =>
        part && typeof part === "object" && part.type === "text" && typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("\n");
  }
  return "";
}

export type BackendFile = { name: string; data: string };

export function extractFilesFromMessages(messages: OpenAIChatMessage[]): BackendFile[] {
  const files: BackendFile[] = [];
  let fileIndex = 0;

  // MIME 类型到扩展名的映射
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv",
    "application/json": "json", "application/xml": "xml",
  };

  for (const m of messages) {
    if (m.role !== "user") continue;
    const content = m.content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;

      let dataUrl: string | undefined;

      // 支持 image_url 类型
      if (part.type === "image_url" && part.image_url?.url) {
        dataUrl = part.image_url.url as string;
      }
      // 支持 file 类型 (部分 OpenAI 兼容 API 使用)
      else if (part.type === "file" && part.file?.url) {
        dataUrl = part.file.url as string;
      }

      if (dataUrl?.startsWith("data:")) {
        const match = dataUrl.match(/^data:([^;]+);/);
        const mime = match?.[1] || "application/octet-stream";
        const ext = mimeToExt[mime] || mime.split("/")[1] || "bin";
        files.push({ name: `file${String(fileIndex++).padStart(3, "0")}.${ext}`, data: dataUrl });
      }
    }
  }
  return files;
}

export function messagesToText(messages: OpenAIChatMessage[]): string {
  // Only send the last user message (backend session maintains history)
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") {
      return asTextContent(m.content);
    }
  }
  return "";
}

export function sseHeaders() {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive",
  };
}

export function openAIChunk(id: string, model: string, delta: string) {
  const payload = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { content: delta } }],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}
