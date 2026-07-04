/**
 * Integrates custom model metadata with Eve's model lookup system.
 * 
 * Eve queries the AI Gateway for model metadata during compilation.
 * This module provides a way to supply metadata for models not in the AI Gateway.
 */

export interface ModelMetadata {
  contextWindow: number;
  maxTokens?: number;
  costPer1MInputTokens?: number;
  costPer1MOutputTokens?: number;
}

// Registry of custom model metadata
const customMetadata: Record<string, ModelMetadata> = {
  deepseek: {
    contextWindow: 128000, // Deepseek V4: 128K tokens
    maxTokens: 8000,
    costPer1MInputTokens: 0.14,
    costPer1MOutputTokens: 0.28,
  },
};

/**
 * Stores custom model metadata that Eve should use.
 * This is called early in the agent setup.
 */
export function registerModelMetadata(
  modelId: string,
  metadata: ModelMetadata
): void {
  customMetadata[modelId] = metadata;

  // Inject into global scope for Eve to discover
  if (typeof global !== "undefined") {
    (global as any).__eveModelMetadata ??= {};
    (global as any).__eveModelMetadata[modelId] = metadata;
  }
}

/**
 * Gets custom metadata for a model.
 */
export function getModelMetadata(modelId: string): ModelMetadata | null {
  return customMetadata[modelId] || null;
}

/**
 * Patches the AI SDK's model creation to include metadata.
 * This helps Eve discover model information even for custom endpoints.
 */
export function patchAISDKModels(): void {
  if (typeof global === "undefined") return;

  // Store metadata in global for any process that accesses it
  (global as any).__eveModelMetadata = customMetadata;

  // Log that patching is active (useful for debugging)
  if (process.env.DEBUG?.includes("eve")) {
    console.log(
      "[Eve Metadata Patch] Registered custom models:",
      Object.keys(customMetadata)
    );
  }
}

/**
 * Returns a mock AI Gateway response for custom models.
 * Can be used if Eve tries to fetch model metadata from the gateway.
 */
export function mockAIGatewayResponse(modelId: string) {
  const meta = customMetadata[modelId];
  if (!meta) return null;

  return {
    id: modelId,
    name: modelId,
    provider: "custom",
    contextWindow: meta.contextWindow,
    maxTokens: meta.maxTokens || 4096,
    costPer1MInputTokens: meta.costPer1MInputTokens || 0,
    costPer1MOutputTokens: meta.costPer1MOutputTokens || 0,
  };
}
