import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import getTeams from "~/data/getTeams.server";
import { getRankedPageData } from "./actions";
import { STARS_PER_RANK } from "../../../../lib/ranked";
import RankedPlayPage from "./RankedPlayPage";

export default async function RankedPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [data, teams] = await Promise.all([
    getRankedPageData(),
    getTeams(session.user.id),
  ]);

  // Map teams to the shape RankedPlayPage expects (only fields it needs)
  const teamProps = teams.map((t) => ({
    uuid: t.uuid,
    name: t.name,
    activeCount: t.activeCount,
    slots: t.slots.map((s) => ({
      uuid: s.uuid,
      slotIndex: s.slotIndex,
      isActive: s.isActive,
      vellymon: s.vellymon
        ? {
            name: s.vellymon.name,
            health: s.vellymon.health,
            attack: s.vellymon.attack,
            speed: s.vellymon.speed,
            imageUrl: s.vellymon.imageUrl,
          }
        : null,
    })),
  }));

  if (!data.hasActiveSeason) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-6xl">🏔️</div>
        <h1 className="text-2xl font-bold text-gray-900">No Active Season</h1>
        <p className="text-gray-600">
          Ranked play begins when a season starts. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <RankedPlayPage
      teams={teamProps}
      summary={data.summary}
      leaderboard={data.leaderboard}
      seasonName={data.seasonName ?? "Season"}
      starsPerRank={STARS_PER_RANK}
    />
  );
}
