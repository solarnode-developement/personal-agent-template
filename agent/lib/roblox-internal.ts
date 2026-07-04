import { appOrigin, internalHeaders } from "./internal-api.js";

export interface RobloxRequest {
  action: string;
  payload: Record<string, unknown>;
  timeout?: number;
}

export interface RobloxResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sends a request to the Roblox plugin via HTTP polling.
 * The plugin running in Roblox Studio will pick up this request
 * and execute it, returning the result.
 */
export async function callRobloxPlugin<T = unknown>(
  request: RobloxRequest,
  userId: string,
): Promise<RobloxResponse<T>> {
  try {
    const response = await fetch(
      `${appOrigin()}/api/internal/roblox/call`,
      {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({
          userId,
          request,
        }),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return response.json() as Promise<RobloxResponse<T>>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Roblox Instance API

export interface RobloxInstance {
  ClassName: string;
  Name: string;
  Properties: Record<string, unknown>;
  Children?: RobloxInstance[];
}

export async function readScript(userId: string, scriptPath: string) {
  return callRobloxPlugin<string>(
    {
      action: "readScript",
      payload: { path: scriptPath },
    },
    userId,
  );
}

export async function writeScript(userId: string, scriptPath: string, code: string) {
  return callRobloxPlugin(
    {
      action: "writeScript",
      payload: { path: scriptPath, code },
    },
    userId,
  );
}

export async function editScript(
  userId: string,
  scriptPath: string,
  lineStart: number,
  lineEnd: number,
  code: string,
) {
  return callRobloxPlugin(
    {
      action: "editScript",
      payload: {
        path: scriptPath,
        lineStart,
        lineEnd,
        code,
      },
    },
    userId,
  );
}

export async function createInstance(
  userId: string,
  className: string,
  parentPath: string,
  name?: string,
) {
  return callRobloxPlugin<{ path: string }>(
    {
      action: "createInstance",
      payload: {
        className,
        parentPath,
        name: name || className,
      },
    },
    userId,
  );
}

export async function deleteInstance(userId: string, instancePath: string) {
  return callRobloxPlugin(
    {
      action: "deleteInstance",
      payload: { path: instancePath },
    },
    userId,
  );
}

export async function getInstanceProperty(
  userId: string,
  instancePath: string,
  propertyName: string,
) {
  return callRobloxPlugin<unknown>(
    {
      action: "getInstanceProperty",
      payload: { path: instancePath, property: propertyName },
    },
    userId,
  );
}

export async function setInstanceProperty(
  userId: string,
  instancePath: string,
  propertyName: string,
  value: unknown,
) {
  return callRobloxPlugin(
    {
      action: "setInstanceProperty",
      payload: { path: instancePath, property: propertyName, value },
    },
    userId,
  );
}

export async function getInstance(userId: string, instancePath: string) {
  return callRobloxPlugin<RobloxInstance>(
    {
      action: "getInstance",
      payload: { path: instancePath },
    },
    userId,
  );
}

// Search and Grep

export async function grepScripts(
  userId: string,
  pattern: string,
  options?: { caseSensitive?: boolean; regex?: boolean },
) {
  return callRobloxPlugin<Array<{ path: string; matches: string[] }>>(
    {
      action: "grepScripts",
      payload: {
        pattern,
        ...options,
      },
    },
    userId,
  );
}

export async function searchInstances(
  userId: string,
  query: string,
  options?: { recursive?: boolean; classFilter?: string },
) {
  return callRobloxPlugin<Array<{ path: string; name: string; className: string }>>(
    {
      action: "searchInstances",
      payload: {
        query,
        ...options,
      },
    },
    userId,
  );
}

export async function listInstanceChildren(userId: string, parentPath: string) {
  return callRobloxPlugin<RobloxInstance[]>(
    {
      action: "listChildren",
      payload: { path: parentPath },
    },
    userId,
  );
}
