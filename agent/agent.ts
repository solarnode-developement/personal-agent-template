import { defineAgent } from "eve";
import { createOpenAI } from "@ai-sdk/openai";

const customOpenAI = createOpenAI({
  baseURL: "https://gen.pollinations.ai/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

export default defineAgent({
  model: customOpenAI("deepseek"),
});
