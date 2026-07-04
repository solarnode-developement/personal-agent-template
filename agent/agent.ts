import { defineAgent } from "eve";
import { openai } from "@ai-sdk/openai";

// Use the custom endpoint with a known model ID format
// The Pollinations API provides Deepseek V4 via their custom OpenAI endpoint
// We'll use gpt-4-turbo as the model identifier since Eve recognizes it,
// but configure it to use the Pollinations endpoint instead
export default defineAgent({
  model: openai("gpt-4-turbo", {
    baseURL: "https://gen.pollinations.ai/v1",
    apiKey: process.env.OPENAI_API_KEY || "",
  }),
});
