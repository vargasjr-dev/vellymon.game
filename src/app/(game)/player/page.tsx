import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getVellymonRoster from "~/data/getVellymonRoster.server";
import getTeams from "~/data/getTeams.server";
import getUserMatches from "~/data/getUserMatches.server";
import VellymonCard from "~/components/VellymonCard";

export default async function PlayerHubPage() {
  const headersList = await headers();
  // Session guaranteed by (game)/layout.tsx auth gate
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [roster, teams, matches] = await Promise.all([
    getVellymonRoster(session.user.id),
    getTeams(session.user.id),
    getUserMatches(session.user.id),
  ]);
  const activeMatchCount = matches.filter(
    (m) => m.status === "waiting" || m.status === "ready" || m.status === "playing",
  ).length;
  const displayName = session.user.name || "Trainer";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {displayName}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s your Vellymon overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Roster Card */}
        <Link
          href="/roster"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎮</span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
              Roster
            </h2>
          </div>
          <p className="text-3xl font-bold text-blue-600">{roster.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {roster.length === 0
              ? "Visit the Market to get started"
              : `vellymon${roster.length !== 1 ? "s" : ""} collected`}
          </p>
        </Link>

        {/* Teams Card */}
        <Link
          href="/teams"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚔️</span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
              Teams
            </h2>
          </div>
          <p className="text-3xl font-bold text-blue-600">{teams.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {teams.length === 0
              ? "Create a team to compete"
              : `team${teams.length !== 1 ? "s" : ""} built`}
          </p>
        </Link>

        {/* Matches Card */}
        <Link
          href="/matches"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏆</span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
              Matches
            </h2>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {activeMatchCount}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {activeMatchCount === 0
              ? "Start or join a match"
              : `active match${activeMatchCount !== 1 ? "es" : ""}`}
          </p>
        </Link>
      </div>

      {/* Roster Preview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Your Vellymons</h2>
          {roster.length > 0 && (
            <Link
              href="/roster"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Full Roster →
            </Link>
          )}
        </div>

        {roster.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🥚</p>
            <p className="text-lg text-gray-600 mb-4">
              Your roster is empty! Head to the Market to collect your first
              vellymon.
            </p>
            <Link
              href="/market"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Visit the Market
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roster.slice(0, 4).map((vellymon) => (
              <VellymonCard
                key={vellymon.uuid}
                name={vellymon.name}
                health={vellymon.health}
                attack={vellymon.attack}
                speed={vellymon.speed}
                energy={vellymon.energy}
                href={`/player/${vellymon.uuid}`}
                variant="compact"
              />
            ))}
          </div>
        )}

        {roster.length > 4 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing 4 of {roster.length} vellymons.{" "}
              <Link
                href="/roster"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
