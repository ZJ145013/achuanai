import { route } from "./src/router.ts";

// Load environment variables from .env file
try {
  const envContent = await Deno.readTextFile(".env");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key) {
      Deno.env.set(key.trim(), valueParts.join("=").trim());
    }
  }
} catch {
  // .env file not found or not readable, continue with existing env vars
}

Deno.serve(async (req) => {
  try {
    return await route(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: { message, type: "api_error", code: "internal_error" },
      }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
});
