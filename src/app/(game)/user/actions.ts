"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { db } from "../../../../data/db";
import { user } from "../../../../data/schema";
import { eq, and, ne } from "drizzle-orm";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// ─── Username ──────────────────────────────────────────────────────────────────

export async function setUsernameAction(
  newUsername: string,
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const trimmed = newUsername.trim().toLowerCase();

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      success: false,
      error:
        "Username must be 3–20 characters and contain only letters, numbers, or underscores.",
    };
  }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.username, trimmed), ne(user.id, session.user.id)))
    .limit(1);

  if (existing) {
    return { success: false, error: "That username is already taken." };
  }

  await db
    .update(user)
    .set({ username: trimmed })
    .where(eq(user.id, session.user.id));

  return { success: true };
}

// ─── Password change ──────────────────────────────────────────────────────────

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters." };
  }
  if (currentPassword === newPassword) {
    return { success: false, error: "New password must be different from your current password." };
  }

  try {
    await auth.api.changePassword({
      headers: headersList,
      body: { currentPassword, newPassword, revokeOtherSessions: false },
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Better-Auth returns "Invalid password" when currentPassword is wrong
    if (msg.toLowerCase().includes("invalid")) {
      return { success: false, error: "Current password is incorrect." };
    }
    return { success: false, error: "Failed to change password. Please try again." };
  }
}

// ─── Email change ─────────────────────────────────────────────────────────────

export async function changeEmailAction(
  newEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();

  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    await auth.api.changeEmail({
      headers: headersList,
      body: { newEmail: trimmed, callbackURL: "/player" },
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already")) {
      return { success: false, error: "That email is already in use." };
    }
    return { success: false, error: "Failed to request email change. Please try again." };
  }
}
