"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";
import { auth } from "~/lib/auth.server";
import { requireAdmin } from "~/lib/admin";
import { db } from "../../../../../data/db";
import { adminApiKey } from "../../../../../data/schema";
import { eq } from "drizzle-orm";

/**
 * Create a new named API key.
 * Returns the raw key (vjk_*) exactly once — it is never stored.
 */
export async function createApiKeyAction(
  name: string,
): Promise<{ success: true; rawKey: string; id: string } | { success: false; error: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  requireAdmin(session);

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name is required" };
  if (trimmed.length > 64) return { success: false, error: "Name too long (max 64 chars)" };

  // Generate key: vjk_ + 32 random bytes as base64url (~43 chars) = ~47 chars total
  const raw = "vjk_" + randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12); // "vjk_" + first 8 base64url chars

  const [record] = await db
    .insert(adminApiKey)
    .values({
      name: trimmed,
      keyHash: hash,
      keyPrefix: prefix,
      createdBy: session!.user.id,
    })
    .returning({ id: adminApiKey.id });

  revalidatePath("/admin/api-keys");
  return { success: true, rawKey: raw, id: record.id };
}

/**
 * Revoke an API key by ID. Only the admin who created it (or any admin) can revoke.
 */
export async function revokeApiKeyAction(
  keyId: string,
): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  requireAdmin(session);

  const [existing] = await db
    .select({ id: adminApiKey.id, revokedAt: adminApiKey.revokedAt })
    .from(adminApiKey)
    .where(eq(adminApiKey.id, keyId))
    .limit(1);

  if (!existing) return { success: false, error: "Key not found" };
  if (existing.revokedAt) return { success: false, error: "Already revoked" };

  await db
    .update(adminApiKey)
    .set({ revokedAt: new Date() })
    .where(eq(adminApiKey.id, keyId));

  revalidatePath("/admin/api-keys");
  return { success: true };
}
