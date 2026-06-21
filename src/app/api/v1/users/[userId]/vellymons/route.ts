/**
 * GET /api/v1/users/[userId]/vellymons
 *
 * List all vellymon instances owned by a user.
 * Returns instanceUuid, modelUuid, name, imageUrl for each — enough for the
 * caller to build a team slot payload for the teams endpoints.
 *
 * Auth: Bearer vjk_* (admin API key)
 */

import { NextResponse } from "next/server";
import { db } from "../../../../../../../data/db";
import { vellymonInstance, user } from "../../../../../../../data/schema";
import { eq } from "drizzle-orm";
import { validateApiKey } from "../../../../../../lib/apiKeyAuth.server";
import getVellymonModel from "../../../../../../data/getVellymonModel.server";
import "../../../../../../../server/powers"; // trigger power registration

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  // Verify user exists
  const [targetUser] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const instances = await db
    .select({
      uuid: vellymonInstance.uuid,
      modelUuid: vellymonInstance.modelUuid,
    })
    .from(vellymonInstance)
    .where(eq(vellymonInstance.userId, userId));

  const vellymons = instances.map((inst) => {
    let name = "Unknown";
    let imageUrl: string | undefined;
    try {
      const model = getVellymonModel(inst.modelUuid);
      name = model.name;
      imageUrl = model.imageUrl;
    } catch {
      // Model not found — return minimal info
    }
    return {
      instanceUuid: inst.uuid,
      modelUuid: inst.modelUuid,
      name,
      imageUrl: imageUrl ?? null,
    };
  });

  return NextResponse.json({ userId, vellymons });
}
