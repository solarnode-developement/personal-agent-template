import { eq, and, gt, ne } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";

/**
 * Roblox Studio Plugin Polling Endpoint
 *
 * The Roblox plugin polls this endpoint to:
 * 1. Get pending requests (actions to execute in the game)
 * 2. Submit completed request results
 * 3. Report heartbeat/connection status
 */
export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const body = method === "POST" ? await readBody(event) : null;

  // Required: User ID and Studio Instance ID
  const userId = body?.userId || getQuery(event).userId;
  const studioInstanceId = body?.studioInstanceId || getQuery(event).studioInstanceId;
  const pluginVersion = body?.pluginVersion;

  if (!userId || !studioInstanceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing userId or studioInstanceId",
    });
  }

  try {
    if (method === "POST") {
      // Heartbeat and response submission
      if (body.action === "heartbeat") {
        // Update or create connection record
        const existing = await db
          .select()
          .from(schema.robloxConnections)
          .where(
            and(
              eq(schema.robloxConnections.userId, userId),
              eq(schema.robloxConnections.studioInstanceId, studioInstanceId),
            ),
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.robloxConnections).values({
            userId,
            studioInstanceId,
            pluginVersion,
            lastHeartbeat: new Date(),
            gameId: body.gameId,
          });
        } else {
          await db
            .update(schema.robloxConnections)
            .set({
              lastHeartbeat: new Date(),
              pluginVersion,
              gameId: body.gameId,
            })
            .where(eq(schema.robloxConnections.id, existing[0].id));
        }

        return {
          success: true,
          message: "Heartbeat recorded",
        };
      }

      // Submit completed request result
      if (body.action === "complete" && body.requestId) {
        await db
          .update(schema.robloxRequests)
          .set({
            status: body.result?.error ? "failed" : "completed",
            result: body.result?.data,
            error: body.result?.error,
            completedAt: new Date(),
          })
          .where(eq(schema.robloxRequests.id, body.requestId));

        return {
          success: true,
          message: "Result recorded",
        };
      }

      throw createError({
        statusCode: 400,
        statusMessage: "Unknown action",
      });
    }

    // GET: Plugin polls for pending requests
    if (method === "GET") {
      const pendingRequests = await db
        .select()
        .from(schema.robloxRequests)
        .where(
          and(
            eq(schema.robloxRequests.userId, userId),
            eq(schema.robloxRequests.status, "pending"),
          ),
        )
        .limit(10); // Get up to 10 pending requests

      return {
        requests: pendingRequests.map((req) => ({
          id: req.id,
          action: req.action,
          payload: req.payload,
        })),
      };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
});
