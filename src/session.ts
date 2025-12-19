function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

// Use Deno KV for persistent session cache (works across Deno Deploy instances)
let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

export function getSessionCacheKey(identifier: string, model: string): string {
  return `${identifier}:${model}`;
}

export async function getCachedSession(key: string): Promise<number | null> {
  try {
    const db = await getKv();
    const result = await db.get<number>(["session", key]);
    return result.value;
  } catch {
    return null;
  }
}

export async function setCachedSession(key: string, backendSessionId: number): Promise<void> {
  try {
    const db = await getKv();
    // Set with 24 hour expiration
    await db.set(["session", key], backendSessionId, { expireIn: 24 * 60 * 60 * 1000 });
  } catch {
    // Ignore errors
  }
}

export function parseSessionId(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i <= 0) return null;
  return i;
}

// Extract the first user message content for session identification
function getFirstUserMessage(messages: Array<{ role?: string; content?: unknown }>): string | null {
  for (const msg of messages) {
    if (msg.role === "user" && typeof msg.content === "string" && msg.content.trim()) {
      return msg.content.trim();
    }
  }
  return null;
}

export function resolveSessionId(
  req: Request,
  body: { user?: string; metadata?: Record<string, unknown>; messages?: unknown[] }
) {
  const headerSid = parseSessionId(req.headers.get("x-session-id"));
  if (headerSid) return { sessionId: headerSid, setHeader: false, cacheKey: null };

  const metaSid = body.metadata?.["sessionId"];
  if (typeof metaSid === "number" && Number.isFinite(metaSid) && metaSid > 0) {
    return { sessionId: Math.trunc(metaSid), setHeader: false, cacheKey: null };
  }

  // Priority 1: Use 'user' field if provided
  if (typeof body.user === "string" && body.user.trim() !== "") {
    const sid = Math.abs(fnv1a32(body.user.trim())) + 1;
    return { sessionId: sid, setHeader: true, cacheKey: body.user.trim() };
  }

  // Priority 2: Use first user message hash for session identification
  // This allows multi-turn conversations to share the same backend session
  const messages = body.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const firstUserMsg = getFirstUserMessage(messages as Array<{ role?: string; content?: unknown }>);
    if (firstUserMsg) {
      const cacheKey = `msg:${fnv1a32(firstUserMsg)}`;
      const sid = Math.abs(fnv1a32(firstUserMsg)) + 1;
      return { sessionId: sid, setHeader: true, cacheKey };
    }
  }

  const sid = Math.floor(Math.random() * 2_000_000_000) + 1;
  return { sessionId: sid, setHeader: true, cacheKey: null };
}
