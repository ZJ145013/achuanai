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
