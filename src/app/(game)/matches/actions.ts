"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "~/lib/auth.server";
import createMatch from "~/data/createMatch.server";

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
