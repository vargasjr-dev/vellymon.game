import { db } from "../../data/db";
import { gameSession } from "../../data/schema";
import { eq, and } from "drizzle-orm";

const cancelMatch = async ({
  matchUuid,
  userId,
}: {
  matchUuid: string;
  userId: string;
}) => {
  try {
    // Only creator can cancel, only waiting matches
    const deleted = await db
      .update(gameSession)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(gameSession.uuid, matchUuid),
          eq(gameSession.createdBy, userId),
          eq(gameSession.status, "waiting"),
        ),
      )
      .returning({ uuid: gameSession.uuid });

    if (deleted.length === 0) {
      return { success: false, message: "Cannot cancel this match" };
    }

    return { success: true, message: "Match cancelled" };
  } catch (error) {
    console.error("Failed to cancel match:", error);
    return { success: false, message: "Failed to cancel match" };
  }
};

export default cancelMatch;
