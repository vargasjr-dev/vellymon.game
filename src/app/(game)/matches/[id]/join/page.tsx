import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import getMatch from "~/data/getMatch.server";
import getTeams from "~/data/getTeams.server";
import JoinTeamSelector from "./JoinTeamSelector";

export default async function JoinMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const match = await getMatch(id);

  if (!match) {
    notFound();
  }

  // Can't join if already in the match
  if (match.players.some((p) => p.userId === session.user.id)) {
    redirect(`/matches/${id}`);
  }

  // Can't join if not waiting
  if (match.status !== "waiting") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">🚫</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Can&apos;t Join
          </h2>
          <p className="text-gray-600 mb-6">
            This match is no longer accepting players.
          </p>
          <Link
            href="/matches"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const teams = await getTeams(session.user.id);
  const eligibleTeams = teams.filter((t) => t.activeCount >= 4);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/matches"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 inline-block"
        >
          ← Back to Matches
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Join Match</h1>
        <p className="text-gray-600 mt-1">
          Joining {match.creatorName ?? "Unknown"}&apos;s match. Select your
          team.
        </p>
      </div>

      {/* Match Info */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Created by{" "}
              <span className="font-semibold text-gray-900">
                {match.creatorName ?? "Unknown"}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              Match {match.uuid.slice(0, 8)} · 1v1
            </p>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
            Waiting
          </span>
        </div>
      </div>

      {/* Team Selection */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">⚔️</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No teams yet
          </h2>
          <p className="text-gray-600 mb-6">
            Build a team before joining a match.
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
            Teams need at least 4 active vellymons to compete.
          </p>
          <Link
            href="/teams"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Manage Teams
          </Link>
        </div>
      ) : (
        <JoinTeamSelector
          matchUuid={match.uuid}
          teams={eligibleTeams}
        />
      )}
    </div>
  );
}
