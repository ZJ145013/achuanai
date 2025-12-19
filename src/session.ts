function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

// Cache: localKey -> backendSessionId
const sessionCache = new Map<string, number>();

export function getSessionCacheKey(user: string, model: string): string {
  return `${user}:${model}`;
}

export function getCachedSession(key: string): number | null {
  return sessionCache.get(key) ?? null;
}

export function setCachedSession(key: string, backendSessionId: number): void {
  sessionCache.set(key, backendSessionId);
}

export function parseSessionId(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i <= 0) return null;
  return i;
}

export function resolveSessionId(req: Request, body: { user?: string; metadata?: Record<string, unknown> }) {
  const headerSid = parseSessionId(req.headers.get("x-session-id"));
  if (headerSid) return { sessionId: headerSid, setHeader: false, cacheKey: null };

  const metaSid = body.metadata?.["sessionId"];
  if (typeof metaSid === "number" && Number.isFinite(metaSid) && metaSid > 0) {
    return { sessionId: Math.trunc(metaSid), setHeader: false, cacheKey: null };
  }

  if (typeof body.user === "string" && body.user.trim() !== "") {
    const sid = Math.abs(fnv1a32(body.user.trim())) + 1;
    return { sessionId: sid, setHeader: true, cacheKey: body.user.trim() };
  }

  const sid = Math.floor(Math.random() * 2_000_000_000) + 1;
  return { sessionId: sid, setHeader: true, cacheKey: null };
}
