import { db } from "../../data/db";
import { vellymonInstance } from "../../data/schema";
import { eq } from "drizzle-orm";

/** Returns the set of model UUIDs the user already owns */
const getOwnedModelUuids = async (userId: string): Promise<Set<string>> => {
  const instances = await db
    .select({ modelUuid: vellymonInstance.modelUuid })
    .from(vellymonInstance)
    .where(eq(vellymonInstance.userId, userId));

  return new Set(instances.map((i) => i.modelUuid));
};

export default getOwnedModelUuids;
