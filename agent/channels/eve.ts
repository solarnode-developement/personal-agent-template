import type { AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { vercelOidc } from "eve/channels/auth";
import { supabaseAdmin } from "../../server/utils/auth";

function appSession(): AuthFn<Request> {
  return async (request) => {
    // Extract JWT token from Authorization header or cookies
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return null;
    }

    try {
      // Verify and get user from Supabase JWT
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      return {
        attributes: {
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        },
        authenticator: "app",
        issuer: "app",
        principalId: user.id,
        principalType: "user",
      };
    } catch {
      return null;
    }
  };
}

export default eveChannel({
  auth: [
    appSession(),
    vercelOidc(),
  ],
});
