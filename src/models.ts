export const SUPPORTED_MODELS = [
  "claude-sonnet-4-5-20250929",
  "gemini-3-pro-preview",
  "gemini-3-pro-preview-image",
  "gpt-5.1-high",
  "deepseek/deepseek-v3.2-exp",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export function isSupportedModel(model: string): model is SupportedModel {
  return (SUPPORTED_MODELS as readonly string[]).includes(model);
}

export function modelsListResponse() {
  const now = Math.floor(Date.now() / 1000);
  return {
    object: "list",
    data: SUPPORTED_MODELS.map((id) => ({
      id,
      object: "model",
      created: now,
      owned_by: "achuan-wrapper",
    })),
  };
}
