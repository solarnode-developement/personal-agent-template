import { logTokenUsage } from "~~/server/utils/starlight";

/**
 * Log token usage and deduct Starlight credits
 * Called by the agent after each AI model invocation
 */
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
    model: string;
    inputTokens: number;
    outputTokens: number;
    context?: string;
  }>(event);

  if (
    !body.userId ||
    !body.model ||
    body.inputTokens === undefined ||
    body.outputTokens === undefined
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: userId, model, inputTokens, outputTokens",
    });
  }

  try {
    const updated = await logTokenUsage({
      userId: body.userId,
      model: body.model,
      inputTokens: body.inputTokens,
      outputTokens: body.outputTokens,
      context: body.context,
    });

    return {
      success: true,
      balance: updated.balance,
      totalSpent: updated.totalSpent,
      message: `Used ${(body.inputTokens + body.outputTokens).toLocaleString()} tokens`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Check if this is an insufficient balance error
    if (message.includes("Insufficient")) {
      throw createError({
        statusCode: 402, // Payment Required
        statusMessage: message,
      });
    }

    throw createError({
      statusCode: 400,
      statusMessage: message,
    });
  }
});
