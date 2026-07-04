import type { H3Event } from "h3";
import { supabaseAdmin } from "~~/server/utils/auth";

export async function requireSessionUserId(event: H3Event): Promise<string> {
  const token = getCookie(event, "sb-access-token");

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    return user.id;
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
}
