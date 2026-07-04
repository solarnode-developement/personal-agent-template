import type { LanguageModel } from "@ai-sdk/provider";

/**
 * Metadata for custom AI models not registered in the AI Gateway.
 * Required for Eve to properly validate and compile agents with custom models.
 */
export interface CustomModelMetadata {
  /** Total context window size in tokens */
  contextWindow: number;
  /** Maximum number of output tokens the model can generate */
  maxOutputTokens?: number;
  /** Cost per 1 million input tokens (optional, for budget estimation) */
  costPerMillionInputTokens?: number;
  /** Cost per 1 million output tokens (optional, for budget estimation) */
  costPerMillionOutputTokens?: number;
  /** Additional capabilities or notes about the model */
  description?: string;
}

/**
 * Validates that required metadata fields are present.
 * Called at build time to catch configuration issues early.
 *
 * @param modelId The model identifier (for error messages)
 * @param metadata The metadata to validate
 * @throws Error if required fields are missing
 */
export function validateCustomMetadata(
  modelId: string,
  metadata: Partial<CustomModelMetadata>
): asserts metadata is CustomModelMetadata {
  const errors: string[] = [];

  if (!metadata.contextWindow || metadata.contextWindow <= 0) {
    errors.push(
      `contextWindow: Must be a positive number (e.g., 128000 for 128K tokens)`
    );
  }

  if (metadata.maxOutputTokens && metadata.maxOutputTokens <= 0) {
    errors.push(
      `maxOutputTokens: Must be a positive number (e.g., 8000). Omit if unknown.`
    );
  }

  if (errors.length > 0) {
    const errorMessage = errors.map((e) => `  - ${e}`).join("\n");
    throw new Error(
      `Invalid metadata for custom model "${modelId}":\n${errorMessage}\n\n` +
        `Required fields:\n` +
        `  - contextWindow (number): Total context window size in tokens\n\n` +
        `Optional fields:\n` +
        `  - maxOutputTokens (number): Maximum output tokens\n` +
        `  - costPerMillionInputTokens (number): Input cost\n` +
        `  - costPerMillionOutputTokens (number): Output cost\n` +
        `  - description (string): Model description\n`
    );
  }
}

/**
 * Registers custom model metadata globally for Eve's use.
 * This approach works around Eve's AI Gateway dependency by storing metadata
 * where Eve can find it during compilation and runtime.
 *
 * Call this during agent initialization (before defineAgent).
 */
export function registerCustomModel(
  modelId: string,
  metadata: CustomModelMetadata
): void {
  validateCustomMetadata(modelId, metadata);

  // Store in a global location that Eve might check
  globalThis.__eveCustomModels ??= {};
  (globalThis.__eveCustomModels as Record<string, CustomModelMetadata>)[
    modelId
  ] = metadata;

  // Also try to inject into environment for process-wide access
  if (typeof process !== "undefined" && process.env) {
    const existing = process.env.EVE_CUSTOM_MODELS || "{}";
    try {
      const models = JSON.parse(existing);
      models[modelId] = metadata;
      process.env.EVE_CUSTOM_MODELS = JSON.stringify(models);
    } catch {
      // If parsing fails, just set the new one
      process.env.EVE_CUSTOM_MODELS = JSON.stringify({ [modelId]: metadata });
    }
  }
}

/**
 * Retrieves registered custom model metadata.
 * Checks both global registration and environment variables.
 */
export function getCustomModel(modelId: string): CustomModelMetadata | null {
  // Check global registry first
  const global = (globalThis.__eveCustomModels as Record<
    string,
    CustomModelMetadata
  > | undefined)?.[modelId];
  if (global) return global;

  // Check environment variable
  if (typeof process !== "undefined" && process.env.EVE_CUSTOM_MODELS) {
    try {
      const models = JSON.parse(process.env.EVE_CUSTOM_MODELS);
      return models[modelId] || null;
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Wraps a language model to provide metadata to Eve.
 * This attaches metadata as properties that might be discoverable.
 *
 * @param model The base language model
 * @param metadata Custom metadata
 * @returns The model with metadata properties
 */
export function attachModelMetadata<T extends LanguageModel>(
  model: T,
  metadata: CustomModelMetadata
): T {
  // Attach to multiple places Eve might check
  Object.assign(model, {
    __metadata: metadata,
    __contextWindow: metadata.contextWindow,
    __maxOutputTokens: metadata.maxOutputTokens,
  });

  return model;
}
