/**
 * getVellymonInstance — fetch a single vellymon instance by UUID.
 *
 * Returns the merged model + instance data enriched with archetype info and
 * special power details. Returns null if the instance doesn't exist or belongs
 * to a different user (caller enforces ownership).
 *
 * Data sources:
 *   - vellymonInstance table: ownership, address, network, version
 *   - getVellymonModel: resolves modelUuid → VellymonStats (name, stats, attacks)
 *   - VELLYMON_LIBRARY: archetype info (not exposed via VellymonStats bridge)
 *   - getPower: special power description
 */

import { db } from "../../data/db";
import { vellymonInstance } from "../../data/schema";
import { eq, and } from "drizzle-orm";
import getVellymonModel from "./getVellymonModel.server";
import { VELLYMON_LIBRARY } from "../../server/vellymonLibrary";
import { getPower } from "../../server/specialPowers";
import "../../server/powers"; // trigger power registration

export type VellymonInstanceDetail = {
  uuid: string;
  address: string;
  network: number;
  version: string;
  userId: string;
  modelUuid: string;
  // From VellymonStats
  name: string;
  health: number;
  attack: number;
  speed: number;
  flavor?: string;
  imageUrl?: string;
  specialPowerId?: string;
  attacks: Array<{
    name: string;
    damage: number;
    energyCost: number;
    range: number;
  }>;
  // From VellymonTemplate (via VELLYMON_LIBRARY lookup by name)
  archetype: string;
  // Enriched from power registry
  powerName?: string;
  powerDescription?: string;
};

export async function getVellymonInstance(
  uuid: string,
  userId: string,
): Promise<VellymonInstanceDetail | null> {
  const rows = await db
    .select()
    .from(vellymonInstance)
    .where(
      and(eq(vellymonInstance.uuid, uuid), eq(vellymonInstance.userId, userId)),
    )
    .limit(1);

  if (rows.length === 0) return null;

  const instance = rows[0];
  const model = getVellymonModel(instance.modelUuid);

  // Look up the template for archetype info (VellymonStats doesn't expose it)
  const template = VELLYMON_LIBRARY.find(
    (t) => t.name.toLowerCase() === model.name.toLowerCase(),
  );

  const power = model.specialPowerId ? getPower(model.specialPowerId) : undefined;

  return {
    uuid: instance.uuid,
    address: instance.address,
    network: instance.network,
    version: instance.version,
    userId: instance.userId,
    modelUuid: instance.modelUuid,
    name: model.name,
    health: model.health,
    attack: model.attack,
    speed: model.speed,
    flavor: model.flavor,
    imageUrl: model.imageUrl,
    specialPowerId: model.specialPowerId,
    attacks: model.attacks.map((a) => ({
      name: a.name,
      damage: a.damage,
      energyCost: a.energyCost,
      range: a.range,
    })),
    archetype: template?.archetype ?? "balanced",
    powerName: power?.name,
    powerDescription: power?.description,
  };
}
