import { db } from "../../data/db";
import { team } from "../../data/schema";
import { eq, and } from "drizzle-orm";

const deleteTeam = async ({
  teamUuid,
  userId,
}: {
  teamUuid: string;
  userId: string;
}) => {
  try {
    // Delete with ownership check — cascade removes slots
    const deleted = await db
      .delete(team)
      .where(and(eq(team.uuid, teamUuid), eq(team.userId, userId)))
      .returning({ uuid: team.uuid });

    if (deleted.length === 0) {
      return { success: false, message: "Team not found" };
    }

    return { success: true, message: "Team deleted!" };
  } catch (error) {
    console.error("Failed to delete team:", error);
    return { success: false, message: "Failed to delete team" };
  }
};

export default deleteTeam;
