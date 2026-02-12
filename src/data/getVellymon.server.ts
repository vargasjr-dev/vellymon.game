import { db } from "../../data/db";
import { vellymonInstance } from "../../data/schema";
import { eq } from "drizzle-orm";
import type { VellymonStats } from "../types/game";
import getVellymonModel from "./getVellymonModel.server";

const getVellymonByUuid = async (uuid: string): Promise<VellymonStats> => {
  const [instance] = await db
    .select()
    .from(vellymonInstance)
    .where(eq(vellymonInstance.uuid, uuid));

  if (!instance) {
    throw new Error(`Could not find vellymon instance ${uuid}`);
  }

  return getVellymonModel(instance.modelUuid);
};

export default getVellymonByUuid;
