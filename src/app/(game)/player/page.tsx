import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getVellymonRoster from "~/data/getVellymonRoster.server";
import getTeams from "~/data/getTeams.server";
import getUserMatches from "~/data/getUserMatches.server";


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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/market"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group text-center"
        >
          <p className="text-3xl mb-2">🏪</p>
          <p className="font-semibold text-gray-900 group-hover:text-blue-600">
            Visit Market
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Browse and collect vellymons
          </p>
        </Link>
        <Link
          href="/guide"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group text-center"
        >
          <p className="text-3xl mb-2">📖</p>
          <p className="font-semibold text-gray-900 group-hover:text-blue-600">
            Game Guide
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Rules, strategy, and vellymon directory
          </p>
        </Link>
      </div>
    </div>
  );
}
