import { defineConfig } from "eve";

export default defineConfig({
  agent: "./agent/agent.ts",
  tools: "./agent/tools",
});
