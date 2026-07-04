import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createInstance,
  deleteInstance,
  getInstance,
  setInstanceProperty,
  getInstanceProperty,
  listInstanceChildren,
  searchInstances,
} from "../lib/roblox-internal.js";

export default defineTool({
  description: "Create, delete, modify, and search Roblox instances in your game.",
  inputSchema: z.object({
    action: z
      .enum(["create", "delete", "get", "set_property", "get_property", "list_children", "search"])
      .describe("Instance action to perform"),
    path: z.string().optional().describe("Instance path (e.g., 'Workspace/Part' or 'ServerScriptService')"),
    className: z
      .string()
      .optional()
      .describe("Instance class name for creation (e.g., 'Part', 'Script', 'Folder')"),
    parentPath: z
      .string()
      .optional()
      .describe("Parent path for new instances (e.g., 'Workspace' or 'ServerScriptService')"),
    name: z.string().optional().describe("Name for new instance"),
    property: z.string().optional().describe("Property name to get or set"),
    value: z.unknown().optional().describe("Property value to set"),
    query: z.string().optional().describe("Search query for instance names"),
    recursive: z.boolean().optional().describe("Search recursively through children"),
    classFilter: z.string().optional().describe("Filter search results by class name"),
  }),
  async execute(
    {
      action,
      path,
      className,
      parentPath,
      name,
      property,
      value,
      query,
      recursive,
      classFilter,
    },
    ctx,
  ) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      throw new Error("Cannot access Roblox tools without authentication");
    }

    switch (action) {
      case "create": {
        if (!className || !parentPath) {
          throw new Error("className and parentPath are required for create action");
        }
        const result = await createInstance(userId, className, parentPath, name);
        if (!result.success) {
          throw new Error(`Failed to create instance: ${result.error}`);
        }
        return {
          success: true,
          path: result.data?.path,
          message: `Created ${className} at ${result.data?.path}`,
        };
      }

      case "delete": {
        if (!path) {
          throw new Error("path is required for delete action");
        }
        const result = await deleteInstance(userId, path);
        if (!result.success) {
          throw new Error(`Failed to delete instance: ${result.error}`);
        }
        return { success: true, message: `Deleted instance at ${path}` };
      }

      case "get": {
        if (!path) {
          throw new Error("path is required for get action");
        }
        const result = await getInstance(userId, path);
        if (!result.success) {
          throw new Error(`Failed to get instance: ${result.error}`);
        }
        return result.data;
      }

      case "get_property": {
        if (!path || !property) {
          throw new Error("path and property are required for get_property action");
        }
        const result = await getInstanceProperty(userId, path, property);
        if (!result.success) {
          throw new Error(`Failed to get property: ${result.error}`);
        }
        return {
          property,
          value: result.data,
        };
      }

      case "set_property": {
        if (!path || !property || value === undefined) {
          throw new Error("path, property, and value are required for set_property action");
        }
        const result = await setInstanceProperty(userId, path, property, value);
        if (!result.success) {
          throw new Error(`Failed to set property: ${result.error}`);
        }
        return {
          success: true,
          message: `Set ${property} to ${JSON.stringify(value)} on ${path}`,
        };
      }

      case "list_children": {
        if (!path) {
          throw new Error("path is required for list_children action");
        }
        const result = await listInstanceChildren(userId, path);
        if (!result.success) {
          throw new Error(`Failed to list children: ${result.error}`);
        }
        return {
          children: result.data || [],
          count: result.data?.length || 0,
        };
      }

      case "search": {
        if (!query) {
          throw new Error("query is required for search action");
        }
        const result = await searchInstances(userId, query, {
          recursive,
          classFilter,
        });
        if (!result.success) {
          throw new Error(`Search failed: ${result.error}`);
        }
        return {
          results: result.data || [],
          count: result.data?.length || 0,
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
});
