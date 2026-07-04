import { supabaseAdmin } from "~~/server/utils/auth";
import { getOrCreateCredits } from "~~/server/utils/starlight";

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  // Signup endpoint
  if (method === "POST" && getRouterParam(event, "all") === "auth/signup") {
    const body = await readBody(event);
    const { email, password } = body;

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email and password are required",
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }

    // Create user profile and Starlight credits
    if (data.user) {
      await getOrCreateCredits(data.user.id);
    }

    // Now sign the user in to get a session
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      throw createError({
        statusCode: 400,
        statusMessage: signInError.message,
      });
    }

    // Set the access token cookie
    setCookie(
      event,
      "sb-access-token",
      signInData.session?.access_token || "",
      {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      }
    );

    return { user: data.user, session: signInData.session };
  }

  // Signin endpoint
  if (method === "POST" && getRouterParam(event, "all") === "auth/signin") {
    const body = await readBody(event);
    const { email, password } = body;

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email and password are required",
      });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }

    // Set the access token in a cookie
    setCookie(
      event,
      "sb-access-token",
      data.session?.access_token || "",
      {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      }
    );

    return { user: data.user, session: data.session };
  }

  // Signout endpoint
  if (
    method === "POST" &&
    getRouterParam(event, "all") === "auth/signout"
  ) {
    deleteCookie(event, "sb-access-token");
    return { ok: true };
  }

  throw createError({
    statusCode: 404,
    statusMessage: "Not found",
  });
});
