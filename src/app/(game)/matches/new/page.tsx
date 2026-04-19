import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getTeams from "~/data/getTeams.server";
import TeamSelector from "./TeamSelector";

export default async function NewMatchPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const teams = await getTeams(session.user.id);

  // Only teams with at least 4 active vellymons can enter a match
  const eligibleTeams = teams.filter((t) => t.activeCount >= 4);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Match</h1>
        <p className="text-gray-600 mt-1">
          Select a team to enter the arena.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">⚔️</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No teams yet
          </h2>
          <p className="text-gray-600 mb-6">
            You need to build a team before creating a match.
          </p>
          <Link
            href="/teams/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Build a Team
          </Link>
        </div>
      ) : eligibleTeams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No eligible teams
          </h2>
          <p className="text-gray-600 mb-6">
            Each team needs at least 4 active vellymons to enter a match.
            Edit a team to set your active lineup.
          </p>
          <Link
            href="/teams"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Manage Teams
          </Link>
        </div>
      ) : (
        <TeamSelector teams={eligibleTeams} />
      )}
    </div>
  );
}
