import { db } from "../../data/db";
import { vellymonInstance } from "../../data/schema";

const buyFromMarket = async ({
  model,
  userId,
}: {
  model: string;
  userId: string;
}) => {
  try {
    const [instance] = await db.insert(vellymonInstance).values({
      modelUuid: model,
      userId,
      address: `0x${Math.random().toString(36).substring(2, 10)}`,
      network: 4,
      version: "0xdeadbeef",
    }).returning();

    return { 
      success: true, 
      message: "Successfully bought vellymon!",
      instanceUuid: instance.uuid,
    };
  } catch (error) {
    console.error('Failed to buy from market:', error);
    return { 
      success: false, 
      message: "Failed to purchase vellymon" 
    };
  }
};

export default buyFromMarket;
