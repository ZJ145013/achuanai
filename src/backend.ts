import { sseHeaders } from "./openai.ts";

export type BackendRequest = { text: string; sessionId: number; files: unknown[] };

export function backendUrl() {
  return Deno.env.get("ACHUAN_API_URL") ?? "https://ai.achuanai.cn/api/chat/completions";
}

export function backendJwt() {
  const jwt = Deno.env.get("ACHUAN_JWT");
  if (!jwt) throw new Error("缺少环境变量 ACHUAN_JWT（后端 Authorization JWT）");
  return jwt;
}

export async function createBackendSession(model: string): Promise<number | null> {
  try {
    const baseUrl = backendUrl().replace(/\/api\/chat\/completions$/, "");
    const sessionUrl = `${baseUrl}/api/chat/session`;

    const res = await fetch(sessionUrl, {
      method: "POST",
      headers: {
        "authorization": backendJwt(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        plugins: [],
        mcp: [],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (data?.data?.id && typeof data.data.id === "number") {
      return data.data.id;
    }
    return null;
  } catch {
    return null;
  }
}

type SSEEvent = { event?: string; data: string };

async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = "";
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Process SSE lines (format: "data: {...}" or "data: [DONE]")
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line || line === 'data: [DONE]') continue;

        const dataMatch = line.match(/^data:\s*(.+)$/);
        if (!dataMatch) continue;

        try {
          const obj = JSON.parse(dataMatch[1]);
          if (obj.type === 'string' && typeof obj.data === 'string') {
            yield { event: obj.type, data: obj.data };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function isSessionNotFoundError(responseText: string): boolean {
  return responseText.includes('"err":"对话不存在"') || responseText.includes('"err":"session not found"');
}

export function parseNonStreamResponse(responseText: string): string {
  const parts: string[] = [];
  const lines = responseText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]') continue;

    const dataMatch = trimmed.match(/^data:\s*(.+)$/);
    if (!dataMatch) continue;

    try {
      const obj = JSON.parse(dataMatch[1]);
      if (obj.type === 'string' && typeof obj.data === 'string') {
        parts.push(obj.data);
      } else if (obj.type === 'object' && obj.data?.aiText) {
        return obj.data.aiText;
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return parts.join('');
}

export function extractDeltaFromBackendData(data: string): string {
  try {
    const obj = JSON.parse(data);
    if (typeof obj === "string") return obj;
    if (typeof obj?.delta === "string") return obj.delta;
    if (typeof obj?.text === "string") return obj.text;
    if (typeof obj?.content === "string") return obj.content;
  } catch {
    // ignore
  }

  // Filter out [user], [assistant], and other metadata prefixes
  let result = data;
  result = result.replace(/^\[user\]\s*/i, "");
  result = result.replace(/^\[assistant\]\s*/i, "");
  result = result.replace(/^\[system\]\s*/i, "");

  return result;
}

export async function fetchBackendSSE(payload: BackendRequest, abortSignal: AbortSignal) {
  const res = await fetch(backendUrl(), {
    method: "POST",
    headers: {
      "authorization": backendJwt(),
      "content-type": "application/json",
      "accept": "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal: abortSignal,
  });
  return res;
}

export async function proxyBackendSSEToOpenAI(
  backendResponse: Response,
  toOpenAIChunk: (delta: string) => string,
) {
  if (!backendResponse.ok) {
    const text = await backendResponse.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: {
          message: `后端错误(${backendResponse.status}): ${text || backendResponse.statusText}`,
          type: "api_error",
          code: "backend_error",
        },
      }),
      { status: backendResponse.status, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
  if (!backendResponse.body) {
    return new Response(
      JSON.stringify({
        error: { message: "后端无响应体(body)，无法流式转发", type: "api_error", code: "backend_empty_body" },
      }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const evt of parseSSE(backendResponse.body!)) {
          const delta = extractDeltaFromBackendData(evt.data);
          if (delta) controller.enqueue(encoder.encode(toOpenAIChunk(delta)));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: { message: `流式转发异常: ${message}`, type: "api_error", code: "stream_error" },
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
