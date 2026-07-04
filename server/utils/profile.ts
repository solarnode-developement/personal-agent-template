import { eq } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import { supabaseAdmin } from "~~/server/utils/auth";
import type { UserProfile, UserProfilePatch, UserProfileWithUser } from "#shared/types/profile";
import {
  deletePhoneLinkForAppUser,
  getPhoneLinkForAppUser,
  upsertPhoneLinkForAppUser,
} from "~~/server/utils/phone-links";

function rowToProfile(row: typeof schema.userProfiles.$inferSelect): UserProfile {
  return {
    userId: row.userId,
    timezone: row.timezone,
    locale: row.locale,
    bio: row.bio,
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function getProfileForUser(userId: string): Promise<UserProfile | undefined> {
  const [row] = await db.select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);

  return row ? rowToProfile(row) : undefined;
}

export async function getOrCreateProfileForUser(userId: string): Promise<UserProfile> {
  const existing = await getProfileForUser(userId);
  if (existing) {
    return existing;
  }

  await db.insert(schema.userProfiles).values({ userId });

  const created = await getProfileForUser(userId);
  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create profile",
    });
  }

  return created;
}

export async function getProfileWithUser(userId: string): Promise<UserProfileWithUser | undefined> {
  // Get user from Supabase auth
  const {
    data: { user: authUser },
  } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (!authUser) {
    return undefined;
  }

  // Get extended profile from database
  const [profile] = await db.select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    // Create default profile if it doesn't exist
    await getOrCreateProfileForUser(userId);
    return getProfileWithUser(userId);
  }

  const phoneLink = await getPhoneLinkForAppUser(userId);

  return {
    ...rowToProfile(profile),
    name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
    email: authUser.email || "",
    phoneNumber: phoneLink?.phoneNumber,
  };
}

export async function updateProfileForUser(userId: string, patch: UserProfilePatch) {
  await getOrCreateProfileForUser(userId);

  // Update auth profile metadata in Supabase if name is provided
  if (patch.name !== undefined) {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        name: patch.name.trim(),
      },
    });
  }

  // Update user profile settings
  await db.update(schema.userProfiles)
    .set({
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    })
    .where(eq(schema.userProfiles.userId, userId));

  // Handle phone number updates
  if (patch.phoneNumber !== undefined) {
    const phone = patch.phoneNumber?.trim() ?? "";
    if (phone) {
      await upsertPhoneLinkForAppUser(userId, phone);
    }
    else {
      await deletePhoneLinkForAppUser(userId);
    }
  }

  return getProfileWithUser(userId);
}
