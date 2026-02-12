import { db } from "../../data/db";
import { gamePlayer } from "../../data/schema";
import { eq } from "drizzle-orm";

/**
 * Gets player details from a game session
 */
const getPlayer = async (playerUuid: string) => {
  const [player] = await db
    .select()
    .from(gamePlayer)
    .where(eq(gamePlayer.uuid, playerUuid));

  if (!player) {
    throw new Error('Player not found');
  }

  return player;
};

export default getPlayer;
