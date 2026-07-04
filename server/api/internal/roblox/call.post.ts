import { eq } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  // Verify internal API access
  const auth = getHeader(event, "authorization");
  if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody<{
    userId: string;
    request: { action: string; payload: Record<string, unknown> };
  }>(event);

  if (!body.userId || !body.request) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing userId or request",
    });
  }

  try {
    // Create a pending request in the database
    const request = await db
      .insert(schema.robloxRequests)
      .values({
        userId: body.userId,
        action: body.request.action,
        payload: body.request.payload,
        status: "pending",
      })
      .returning();

    const requestId = request[0]?.id;

    // Poll for the response with timeout
    const maxWaitTime = body.request.timeout || 30000; // 30 seconds default
    const pollInterval = 100; // Check every 100ms
    const maxPolls = Math.ceil(maxWaitTime / pollInterval);

    for (let i = 0; i < maxPolls; i++) {
      // Wait before polling
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      // Check if request is completed
      const completed = await db
        .select()
        .from(schema.robloxRequests)
        .where(eq(schema.robloxRequests.id, requestId))
        .limit(1);

      if (completed.length === 0) {
        continue;
      }

      const req = completed[0];
      if (req.status === "completed") {
        return {
          success: true,
          data: req.result,
        };
      }

      if (req.status === "failed") {
        return {
          success: false,
          error: req.error || "Unknown error",
        };
      }
    }

    // Timeout - request never completed
    await db
      .update(schema.robloxRequests)
      .set({ status: "failed", error: "Request timeout" })
      .where(eq(schema.robloxRequests.id, requestId));

    return {
      success: false,
      error: "Request timeout: Roblox Studio plugin did not respond",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
});
