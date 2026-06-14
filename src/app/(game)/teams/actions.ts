"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "~/lib/auth.server";
import createTeam from "~/data/createTeam.server";
import updateTeam from "~/data/updateTeam.server";
import deleteTeam from "~/data/deleteTeam.server";
import type { SlotInput } from "~/data/createTeam.server";

export async function createTeamAction(name: string, slots: SlotInput[]) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await createTeam({
    name,
    userId: session.user.id,
    slots,
  });

  if (result.success) {
    revalidatePath("/teams");
    revalidatePath("/roster");
    revalidatePath("/player");
  }

  return result;
}

export async function updateTeamAction(
  teamUuid: string,
  name?: string,
  slots?: SlotInput[],
) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await updateTeam({
    teamUuid,
    userId: session.user.id,
    name,
    slots,
  });

  if (result.success) {
    revalidatePath("/teams");
    revalidatePath("/roster");
    revalidatePath("/player");
  }

  return result;
}

export async function deleteTeamAction(teamUuid: string) {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const result = await deleteTeam({
    teamUuid,
    userId: session.user.id,
  });

  if (result.success) {
    revalidatePath("/teams");
    revalidatePath("/roster");
    revalidatePath("/player");
  }

  return result;
}
