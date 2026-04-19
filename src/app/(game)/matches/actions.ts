"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "~/lib/auth.server";
import createMatch from "~/data/createMatch.server";
import joinGame from "~/data/joinGame.server";

export async function createMatchAction(teamUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await createMatch({
    userId: session.user.id,
    teamUuid,
  });

  if (result.success) {
    revalidatePath("/matches");
    revalidatePath("/player");
  }

  return result;
}

export async function joinMatchAction(matchUuid: string, teamUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await joinGame({
    gameSessionUuid: matchUuid,
    userId: session.user.id,
    teamUuid,
  });

  if (result.success) {
    revalidatePath("/matches");
    revalidatePath(`/matches/${matchUuid}`);
    revalidatePath("/player");
  }

  return result;
}
