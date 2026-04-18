import { db } from "../../data/db";
import { team, teamSlot, vellymonInstance } from "../../data/schema";
import { eq } from "drizzle-orm";
import getVellymonModel from "./getVellymonModel.server";

const getTeams = async (userId: string) => {
  const teams = await db
    .select()
    .from(team)
    .where(eq(team.userId, userId))
    .orderBy(team.createdAt);

  return Promise.all(
    teams.map(async (t) => {
      const slots = await db
        .select({
          uuid: teamSlot.uuid,
          slotIndex: teamSlot.slotIndex,
          isActive: teamSlot.isActive,
          vellymonInstanceUuid: teamSlot.vellymonInstanceUuid,
          instanceUuid: vellymonInstance.uuid,
          modelUuid: vellymonInstance.modelUuid,
        })
        .from(teamSlot)
        .innerJoin(
          vellymonInstance,
          eq(teamSlot.vellymonInstanceUuid, vellymonInstance.uuid),
        )
        .where(eq(teamSlot.teamUuid, t.uuid))
        .orderBy(teamSlot.slotIndex);

      const populatedSlots = await Promise.all(
        slots.map(async (s) => {
          const model = await getVellymonModel(s.modelUuid);
          return {
            ...s,
            vellymon: model,
          };
        }),
      );

      return {
        ...t,
        slots: populatedSlots,
        activeCount: populatedSlots.filter((s) => s.isActive).length,
      };
    }),
  );
};

export default getTeams;
