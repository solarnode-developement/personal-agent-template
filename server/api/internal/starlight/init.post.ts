import { initializePricing } from "~~/server/utils/starlight";

/**
 * Initialize Starlight system on first run
 * Creates default model pricing if not already set up
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

  try {
    const pricing = await initializePricing();

    return {
      success: true,
      message: "Starlight system initialized",
      models: pricing.map((p) => ({
        id: p.modelId,
        name: p.modelName,
        starlightPerMTokens: p.starlightPerMCombinedTokens,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
});
