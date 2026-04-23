"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import createAdminMatch from "~/data/createAdminMatch.server";
import type { MatchSettings } from "~/lib/matchSettings";

export async function createAdminMatchAction(settings?: MatchSettings) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !isAdmin(session)) {
    throw new Error("Forbidden: admin access required");
  }

  const result = await createAdminMatch(session.user.id, settings);

  if (!result.success || !("matchUuid" in result)) {
    throw new Error(result.success ? "Unknown error" : result.message);
  }

  redirect(`/matches/${result.matchUuid}`);
}
