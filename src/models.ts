// 参考模型列表（仅用于 /v1/models 端点展示，不做验证）
const REFERENCE_MODELS = [
  "claude-sonnet-4-5-20250929",
  "gemini-3-pro-preview",
  "gemini-3-pro-preview-image",
  "gpt-5.1-high",
  "deepseek/deepseek-v3.2-exp",
];

export function modelsListResponse() {
  const now = Math.floor(Date.now() / 1000);
  return {
    object: "list",
    data: REFERENCE_MODELS.map((id) => ({
      id,
      object: "model",
      created: now,
      owned_by: "achuan-wrapper",
    })),
  };
}
