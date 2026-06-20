/**
 * Admin API key authentication middleware.
 *
 * Keys use the format: vjk_<32-byte-base64url>
 * Only the SHA-256 hash is stored; the raw key is shown once at creation.
 *
 * Usage in an API route:
 *   const key = await validateApiKey(req);
 *   if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */

import { createHash } from "crypto";
import { db } from "../../data/db";
import { adminApiKey } from "../../data/schema";
import { eq } from "drizzle-orm";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string;
};

/**
 * Validate the Bearer token from an incoming request against stored API keys.
 * Updates lastUsedAt on success (fire-and-forget).
 * Returns the key record on success, null on failure or revocation.
 */
export async function validateApiKey(req: Request): Promise<ApiKeyRecord | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer vjk_")) return null;

  const raw = authHeader.slice(7); // strip "Bearer "
  const hash = createHash("sha256").update(raw).digest("hex");

  const [record] = await db
    .select({
      id: adminApiKey.id,
      name: adminApiKey.name,
      keyPrefix: adminApiKey.keyPrefix,
      createdBy: adminApiKey.createdBy,
      revokedAt: adminApiKey.revokedAt,
    })
    .from(adminApiKey)
    .where(eq(adminApiKey.keyHash, hash))
    .limit(1);

  if (!record || record.revokedAt !== null) return null;

  // Update lastUsedAt asynchronously — don't block response
  void db
    .update(adminApiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(adminApiKey.id, record.id))
    .catch((e) => console.error("[apiKeyAuth] lastUsedAt update failed:", e));

  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    createdBy: record.createdBy,
  };
}
