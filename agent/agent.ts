import { defineAgent } from "eve";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Custom Model Configuration for Eve
 *
 * CURRENT WORKAROUND:
 * Eve v0.13.8 requires models to be registered in the Vercel AI Gateway.
 * Since our custom Deepseek model via Pollinations isn't in the gateway,
 * we use "gpt-4-turbo" as the model ID (which Eve recognizes for compilation),
 * but route it to the Pollinations custom endpoint.
 *
 * This allows the agent to:
 * - Compile successfully with Eve (using gpt-4-turbo metadata)
 * - Use Deepseek V4 at runtime (via Pollinations endpoint)
 * - Maintain compatible token counts (gpt-4-turbo ~= deepseek context)
 *
 * FUTURE: When Eve supports custom model metadata, update agent.ts to use
 * the custom-model.ts utilities for true custom model support.
 * See docs/CUSTOM_MODELS.md for details.
 */

// Create custom OpenAI-compatible client pointing to Pollinations API
const customOpenAI = createOpenAI({
  baseURL: "https://gen.pollinations.ai/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Use gpt-4-turbo model ID (Eve recognizes this) but route to Pollinations
// The Pollinations API provides Deepseek V4 when using this endpoint
const model = customOpenAI.languageModel("gpt-4-turbo");

export default defineAgent({
  model,
});
