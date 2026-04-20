/**
 * Admin utilities — role checking and session helpers.
 *
 * The `role` field lives on the user table (data/schema.ts) and is
 * exposed in the session via BetterAuth's additionalFields config.
 * Values: "user" (default) | "admin".
 */

import type { Session, User } from "./auth.server";

/** Check if a session's user has admin role */
export function isAdmin(session: { user: User } | null): boolean {
  if (!session?.user) return false;
  return (session.user as User & { role?: string }).role === "admin";
}

/** Require admin or throw. Use in server actions / API routes. */
export function requireAdmin(session: { user: User } | null): asserts session is { user: User } {
  if (!isAdmin(session)) {
    throw new Error("Forbidden: admin access required");
  }
}
