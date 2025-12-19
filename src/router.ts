import { modelsListResponse } from "./models.ts";
import { json, openAIError, messagesToText, openAIChunk } from "./openai.ts";
import { resolveSessionId, getSessionCacheKey, getCachedSession, setCachedSession } from "./session.ts";
import { fetchBackendSSE, proxyBackendSSEToOpenAI, createBackendSession, isSessionNotFoundError, parseNonStreamResponse } from "./backend.ts";

export async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname === "/v1/models") {
    return json(200, modelsListResponse());
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return openAIError(400, "请求体必须是 JSON 对象");

    const model = (body as any).model;
    if (typeof model !== "string" || model.trim() === "") return openAIError(400, "缺少 model");

    const messages = (body as any).messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return openAIError(400, "messages 必须是非空数组");
    }

    const text = messagesToText(messages);
    if (!text) return openAIError(400, "无法从 messages 提取文本");

    let { sessionId, setHeader, cacheKey } = resolveSessionId(req, body);
    const stream = (body as any).stream ?? false;

    // Check if we have a cached backend session for this user+model
    const fullCacheKey = cacheKey ? getSessionCacheKey(cacheKey, model) : null;
    if (fullCacheKey) {
      const cachedSid = await getCachedSession(fullCacheKey);
      if (cachedSid) {
        sessionId = cachedSid;
        setHeader = false;
      }
    }

    // If sessionId was generated (not from cache), try to create a new session
    if (setHeader) {
      const newSessionId = await createBackendSession(model);
      if (newSessionId) {
        sessionId = newSessionId;
        if (fullCacheKey) {
          await setCachedSession(fullCacheKey, newSessionId);
        }
      }
    }

    const controller = new AbortController();
    req.signal.addEventListener("abort", () => controller.abort());

    const doRequest = async (sid: number) => {
      return fetchBackendSSE({ text, sessionId: sid, files: [] }, controller.signal).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
          JSON.stringify({
            error: { message: `后端连接失败: ${message}`, type: "api_error", code: "backend_connection_error" },
          }),
          { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      });
    };

    let backendResp = await doRequest(sessionId);
    if (!(backendResp instanceof Response)) return backendResp;

    // Check for session not found error and retry with new session
    if (!stream && backendResp.ok) {
      const cloned = backendResp.clone();
      const bodyText = await cloned.text();
      if (isSessionNotFoundError(bodyText)) {
        const newSessionId = await createBackendSession(model);
        if (newSessionId) {
          sessionId = newSessionId;
          setHeader = true;
          if (fullCacheKey) {
            await setCachedSession(fullCacheKey, newSessionId);
          }
          backendResp = await doRequest(sessionId);
          if (!(backendResp instanceof Response)) return backendResp;
        }
      }
    }

    if (stream) {
      // For streaming, we need to check the first chunk for session error
      if (backendResp.ok && backendResp.body) {
        const [checkStream, responseStream] = backendResp.body.tee();
        const reader = checkStream.getReader();
        const { value } = await reader.read();
        reader.releaseLock();

        if (value) {
          const text = new TextDecoder().decode(value);
          if (isSessionNotFoundError(text)) {
            const newSessionId = await createBackendSession(model);
            if (newSessionId) {
              sessionId = newSessionId;
              setHeader = true;
              if (fullCacheKey) {
                await setCachedSession(fullCacheKey, newSessionId);
              }
              backendResp = await doRequest(sessionId);
              if (!(backendResp instanceof Response)) return backendResp;
            }
          } else {
            // Reconstruct the response with the teed stream
            backendResp = new Response(responseStream, {
              status: backendResp.status,
              headers: backendResp.headers,
            });
          }
        }
      }

      const chunkId = `chatcmpl-${Date.now()}`;
      const sseResp = await proxyBackendSSEToOpenAI(backendResp, (delta) => openAIChunk(chunkId, model, delta));
      const headers = new Headers(sseResp.headers);
      if (setHeader) headers.set("x-session-id", String(sessionId));
      return new Response(sseResp.body, { status: sseResp.status, headers });
    } else {
      const respText = await backendResp.text().catch(() => "");
      const content = parseNonStreamResponse(respText) || respText;
      const response = {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
      return json(200, response, setHeader ? { "x-session-id": String(sessionId) } : {});
    }
  }

  return openAIError(404, "Not Found");
}
