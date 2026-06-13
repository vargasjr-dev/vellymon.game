"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import {
  createAiProfile,
  deleteAiProfile,
} from "~/data/aiProfiles.server";
import { VELLYMON_LIBRARY } from "../../../../../server/vellymonLibrary";

function assertAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  if (!isAdmin(session)) throw new Error("Forbidden");
}

export async function createProfileAction(formData: FormData) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  assertAdmin(session);

  const id = (formData.get("id") as string).trim().toLowerCase().replace(/\s+/g, "-");
  const name = (formData.get("name") as string).trim();
  const aiDifficulty = formData.get("aiDifficulty") as "easy" | "medium" | "hard";
  const description = (formData.get("description") as string | null)?.trim() || undefined;

  // teamNames is a comma-separated list of vellymon names submitted from the form
  const teamNamesRaw = formData.get("teamNames") as string;
  const teamNames = teamNamesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!id || !name) throw new Error("id and name are required");
  if (teamNames.length < 4 || teamNames.length > 6) {
    throw new Error("Team must have 4–6 vellymon names (4 active + up to 2 bench)");
  }

  // Validate every name exists in the library
  const unknown = teamNames.filter(
    (n) => !VELLYMON_LIBRARY.some((v) => v.name.toLowerCase() === n.toLowerCase()),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown vellymon names: ${unknown.join(", ")}`);
  }

  await createAiProfile({ id, name, teamNames, aiDifficulty, description });
  revalidatePath("/admin/profiles");
}

export async function deleteProfileAction(profileId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  assertAdmin(session);
  await deleteAiProfile(profileId);
  revalidatePath("/admin/profiles");
}
