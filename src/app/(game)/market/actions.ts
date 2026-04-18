"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import buyFromMarket from "~/data/buyFromMarket.server";

export async function purchaseVellymon(modelUuid: string) {
  const headersList = await headers();
  // Session guaranteed by (game)/layout.tsx auth gate
  const session = (await auth.api.getSession({ headers: headersList }))!;

  return buyFromMarket({ model: modelUuid, userId: session.user.id });
}
