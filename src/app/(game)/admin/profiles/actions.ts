"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { createAiProfile, deleteAiProfile } from "~/data/aiProfiles.server";
import { VELLYMON_LIBRARY } from "../../../../../server/vellymonLibrary";

function assertAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  if (!isAdmin(session)) throw new Error("Forbidden");
}

/** Convert a display name to a URL-safe slug, e.g. "Aggro Hard!" → "aggro-hard" */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Auto-select vellymons using Claude Haiku based on the profile description.
 * Returns a list of `count` names from VELLYMON_LIBRARY.
 * Falls back to random picks if ANTHROPIC_API_KEY is not set.
 */
async function autoSelectMons(
  description: string,
  existing: string[],
  count: number,
): Promise<string[]> {
  const available = VELLYMON_LIBRARY.filter(
    (v) => !existing.includes(v.name),
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: random picks from available pool
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((v) => v.name);
  }

  // Use Anthropic SDK to call Claude Haiku
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const monList = available
    .map(
      (v) =>
        `- ${v.name} [${v.archetype}] (HP ${v.hp}, ATK ${v.attack}, SPD ${v.speed}) — "${v.flavor}"`,
    )
    .join("\n");

  const existingText =
    existing.length > 0
      ? `Current partial team: ${existing.join(", ")}\n`
      : "";

  const prompt = `You are helping build a vellymon team for an AI player profile.

Profile description (this defines the AI's playstyle and personality):
"${description}"

${existingText}You need to pick exactly ${count} vellymon${count > 1 ? "s" : ""} to add to the team.
The team is 8 vellymons total — which ones start or sit on the bench is decided later at pregame.

Each vellymon entry shows: name [archetype] (HP, ATK, SPD) — flavor text.
Archetypes: speedster (high SPD), tank (high HP), glass_cannon (high ATK/low HP), support, balanced.

Available vellymons:
${monList}

Pick ${count} that best match the profile's description and strategy.
Pay close attention to the stats — if the description emphasises speed/aggression/bulk, match the archetype and stats accordingly.
Return ONLY a JSON array of the vellymon names, nothing else.
Example: ["Aerobolt", "Zipfang"]`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    system:
      "You are a competitive team-builder. Select vellymons whose stats and archetype best fit the described playstyle. Prioritise stat alignment over thematic name/flavor matching.",
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "[]";

  let picked: string[] = [];
  try {
    picked = JSON.parse(text);
  } catch {
    // If JSON parse fails, fall back to random
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((v) => v.name);
  }

  // Validate each name is real and not already in team
  const valid = picked.filter((n) =>
    VELLYMON_LIBRARY.some(
      (v) => v.name.toLowerCase() === n.toLowerCase() && !existing.includes(v.name),
    ),
  );

  // Pad with random picks if Haiku returned fewer than needed
  if (valid.length < count) {
    const remaining = available
      .filter((v) => !valid.includes(v.name))
      .sort(() => Math.random() - 0.5)
      .slice(0, count - valid.length)
      .map((v) => v.name);
    return [...valid, ...remaining];
  }

  return valid.slice(0, count);
}

export async function createProfileAction(formData: FormData) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  assertAdmin(session);

  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const randomnessRaw = formData.get("randomness") as string | null;
  const randomness = randomnessRaw ? Math.max(0, Math.min(1, parseFloat(randomnessRaw))) : 0.5;

  if (!name) throw new Error("Name is required");
  if (!description) throw new Error("Description (prompt) is required");

  const id = nameToSlug(name);
  if (!id) throw new Error("Name must contain at least one letter or digit");

  // teamNames is a comma-separated list submitted from the MonTeamSelector
  const teamNamesRaw = (formData.get("teamNames") as string | null) ?? "";
  let teamNames = teamNamesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Validate any manually-picked names exist in the library
  const unknown = teamNames.filter(
    (n) => !VELLYMON_LIBRARY.some((v) => v.name.toLowerCase() === n.toLowerCase()),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown vellymon names: ${unknown.join(", ")}`);
  }

  // Auto-fill remaining slots up to 8 (starters vs bench decided at pregame)
  if (teamNames.length < 8) {
    const needed = 8 - teamNames.length;
    const autoPicked = await autoSelectMons(description, teamNames, needed);
    teamNames = [...teamNames, ...autoPicked];
  }

  // Final validation: exactly 8
  if (teamNames.length !== 8) {
    throw new Error("Could not build an 8-vellymon team");
  }

  await createAiProfile({ id, name, teamNames, randomness, description });
  revalidatePath("/admin/profiles");
}

export async function deleteProfileAction(profileId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  assertAdmin(session);
  await deleteAiProfile(profileId);
  revalidatePath("/admin/profiles");
}
