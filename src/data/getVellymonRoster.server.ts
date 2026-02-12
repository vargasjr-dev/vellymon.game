import { db } from "../../data/db";
import { vellymonInstance } from "../../data/schema";
import { eq } from "drizzle-orm";
import getVellymonModel from "./getVellymonModel.server";

const getVellymonRoster = async (userId: string) => {
  const instances = await db
    .select()
    .from(vellymonInstance)
    .where(eq(vellymonInstance.userId, userId));

  return Promise.all(
    instances.map(async (instance) => {
      const model = await getVellymonModel(instance.modelUuid);
      return { ...model, ...instance };
    })
  );
};

export default getVellymonRoster;
