/**
 * Custom model metadata registry for Eve.
 * 
 * Eve requires metadata (context window, max tokens, etc.) for all models used in agents.
 * For custom models not registered in the AI Gateway, provide metadata here.
 * 
 * The metadata is used by Eve for:
 * - Agent compaction and compression validation
 * - Token estimation and cost calculation
 * - Build-time configuration validation
 */

export interface ModelMetadataRegistry {
  [modelId: string]: {
    contextWindow: number;
    maxOutputTokens?: number;
    costPerMillionInputTokens?: number;
    costPerMillionOutputTokens?: number;
  };
}

/**
 * Registry of custom model metadata.
 * Add entries here for any models not recognized by the AI Gateway.
 */
export const customModelMetadata: ModelMetadataRegistry = {
  deepseek: {
    contextWindow: 128000, // 128K tokens - Deepseek V4 context window
    maxOutputTokens: 8000, // Reasonable max output
    costPerMillionInputTokens: 0.14, // Estimated based on Pollinations pricing
    costPerMillionOutputTokens: 0.28,
  },
};

/**
 * Resolves model metadata, checking both custom registry and defaults.
 * Can be extended to query the AI Gateway or other sources.
 */
export function resolveModelMetadata(modelId: string) {
  const customEntry = customModelMetadata[modelId];
  if (customEntry) {
    return customEntry;
  }
  
  // If not in custom registry, return undefined to let Eve handle it
  // (it will try to look it up in AI Gateway)
  return undefined;
}
