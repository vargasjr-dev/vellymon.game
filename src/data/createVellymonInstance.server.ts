import { db } from "../../data/db";
import { vellymonInstance } from "../../data/schema";

const createVellymonInstance = async ({
  model,
  userId,
  address,
  network,
  version,
}: {
  model: string;
  userId: string;
  address: string;
  network: number;
  version: string;
}): Promise<string> => {
  const [instance] = await db.insert(vellymonInstance).values({
    modelUuid: model,
    userId,
    address,
    network,
    version,
  }).returning();

  return instance.uuid;
};

export default createVellymonInstance;
