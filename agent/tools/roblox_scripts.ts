import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  readScript,
  writeScript,
  editScript,
  grepScripts,
} from "../lib/roblox-internal.js";

export default defineTool({
  description: "Read, write, and edit Roblox scripts in your game. Can also search scripts with grep patterns.",
  inputSchema: z.object({
    action: z.enum(["read", "write", "edit", "grep"]).describe("Script action to perform"),
    path: z.string().describe("Script path (e.g., 'ServerScriptService/MyScript' or 'ReplicatedStorage/Modules/Utilities')"),
    code: z.string().optional().describe("Code to write or replace (required for write/edit actions)"),
    lineStart: z.number().int().optional().describe("Starting line number for edit (1-indexed, required for edit)"),
    lineEnd: z.number().int().optional().describe("Ending line number for edit (1-indexed, inclusive, required for edit)"),
    pattern: z.string().optional().describe("Search pattern for grep (regex or literal string)"),
    caseSensitive: z.boolean().optional().describe("Case-sensitive search for grep"),
    regex: z.boolean().optional().describe("Use regex pattern in grep search"),
  }),
  async execute({ action, path, code, lineStart, lineEnd, pattern, caseSensitive, regex }, ctx) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      throw new Error("Cannot access Roblox tools without authentication");
    }

    switch (action) {
      case "read": {
        const result = await readScript(userId, path);
        if (!result.success) {
          throw new Error(`Failed to read script: ${result.error}`);
        }
        return { content: result.data };
      }

      case "write": {
        if (!code) {
          throw new Error("Code is required for write action");
        }
        const result = await writeScript(userId, path, code);
        if (!result.success) {
          throw new Error(`Failed to write script: ${result.error}`);
        }
        return { success: true, message: `Script written to ${path}` };
      }

      case "edit": {
        if (!code || lineStart === undefined || lineEnd === undefined) {
          throw new Error("Code, lineStart, and lineEnd are required for edit action");
        }
        const result = await editScript(userId, path, lineStart, lineEnd, code);
        if (!result.success) {
          throw new Error(`Failed to edit script: ${result.error}`);
        }
        return { success: true, message: `Lines ${lineStart}-${lineEnd} updated in ${path}` };
      }

      case "grep": {
        if (!pattern) {
          throw new Error("Pattern is required for grep action");
        }
        const result = await grepScripts(userId, pattern, { caseSensitive, regex });
        if (!result.success) {
          throw new Error(`Search failed: ${result.error}`);
        }
        return {
          matches: result.data || [],
          count: result.data?.length || 0,
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
});
