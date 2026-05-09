import { db } from "../data/db";
import { cosmetic, cosmeticLoadout, user } from "../data/schema";
import { eq, and } from "drizzle-orm";

export type CosmeticType =
  | "skin"
  | "vfx_harvest"
  | "vfx_attack"
  | "vfx_ko"
  | "board_theme"
  | "profile_border"
  | "title";

export type CosmeticSource =
  | "generated"
  | "seasonal"
  | "monthly_drop"
  | "ranked_reward";

/**
 * Get all cosmetics owned by a user.
 */
export async function getUserCosmetics(userId: string) {
  return db
    .select()
    .from(cosmetic)
    .where(eq(cosmetic.userId, userId))
    .orderBy(cosmetic.createdAt);
}

/**
 * Get cosmetics for a specific vellymon (includes global cosmetics with null vellymonId).
 */
export async function getVellymonCosmetics(
  userId: string,
  vellymonId: string,
) {
  const all = await getUserCosmetics(userId);
  return all.filter(
    (c) => c.vellymonId === vellymonId || c.vellymonId === null,
  );
}

/**
 * Get the equipped loadout for a vellymon.
 */
export async function getLoadout(userId: string, vellymonId: string) {
  const [loadout] = await db
    .select()
    .from(cosmeticLoadout)
    .where(
      and(
        eq(cosmeticLoadout.userId, userId),
        eq(cosmeticLoadout.vellymonId, vellymonId),
      ),
    )
    .limit(1);

  return loadout ?? null;
}

/**
 * Equip a cosmetic skin on a vellymon. Creates loadout if it doesn't exist.
 */
export async function equipSkin(
  userId: string,
  vellymonId: string,
  cosmeticId: string | null,
) {
  const existing = await getLoadout(userId, vellymonId);

  if (existing) {
    await db
      .update(cosmeticLoadout)
      .set({ equippedSkinId: cosmeticId })
      .where(eq(cosmeticLoadout.id, existing.id));
  } else {
    await db.insert(cosmeticLoadout).values({
      userId,
      vellymonId,
      equippedSkinId: cosmeticId,
      equippedVfxIds: [],
    });
  }
}

/**
 * Check if cosmetics should be active (user is a subscriber).
 * Dormant cosmetics exist in DB but render as defaults.
 */
export async function areCosmeticsActive(userId: string): Promise<boolean> {
  const [result] = await db
    .select({ subscriptionStatus: user.subscriptionStatus })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result?.subscriptionStatus === "active";
}

/**
 * Get the effective skin URL for a vellymon, respecting dormancy.
 * Returns null if no custom skin or cosmetics are dormant.
 */
export async function getEffectiveSkin(
  userId: string,
  vellymonId: string,
): Promise<string | null> {
  const active = await areCosmeticsActive(userId);
  if (!active) return null;

  const loadout = await getLoadout(userId, vellymonId);
  if (!loadout?.equippedSkinId) return null;

  const [skin] = await db
    .select({ imageUrl: cosmetic.imageUrl })
    .from(cosmetic)
    .where(eq(cosmetic.id, loadout.equippedSkinId))
    .limit(1);

  return skin?.imageUrl ?? null;
}
