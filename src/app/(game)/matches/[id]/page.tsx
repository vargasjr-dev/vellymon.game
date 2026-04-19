import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import getMatch from "~/data/getMatch.server";

export default async function MatchDetailPage({
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

  const isCreator = match.createdBy === session.user.id;
  const isPlayer = match.players.some((p) => p.userId === session.user.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/matches"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 inline-block"
          >
            ← Back to Matches
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {match.status === "waiting"
              ? "Waiting for Opponent"
              : match.status === "ready"
                ? "Match Ready!"
                : match.status === "playing"
                  ? "Match in Progress"
                  : "Match"}
          </h1>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* Players */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Players ({match.currentPlayers}/{match.maxPlayers})
        </h2>
        <div className="space-y-4">
          {match.players.map((player) => (
            <div
              key={player.uuid}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {player.userName ?? "Unknown"}
                  {player.userId === session.user.id && (
                    <span className="text-xs text-blue-600 ml-2">(You)</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Team: {player.teamName ?? "Unknown"}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                Joined{" "}
                {new Date(player.joinedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {/* Empty slot */}
          {match.currentPlayers < match.maxPlayers && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">
                Waiting for opponent to join...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Match Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Match Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Created by</p>
            <p className="font-semibold text-gray-900">
              {match.creatorName ?? "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Match ID</p>
            <p className="font-mono text-xs text-gray-700">
              {match.uuid.slice(0, 8)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Format</p>
            <p className="font-semibold text-gray-900">1v1</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-semibold text-gray-900 capitalize">
              {match.status}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {match.status === "waiting" && !isPlayer && (
        <Link
          href={`/matches/${match.uuid}/join`}
          className="block w-full text-center bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition mb-3"
        >
          Join This Match
        </Link>
      )}

      {match.status === "waiting" && isCreator && (
        <Link
          href={`/matches/${match.uuid}/join?pbs=true`}
          className="block w-full text-center bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition mb-3"
        >
          ⚔️ Play Both Sides (Playtest)
        </Link>
      )}

      {match.status === "playing" && isPlayer && (
        <Link
          href={`/matches/${match.uuid}/play`}
          className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Enter Battle
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    playing: "bg-blue-100 text-blue-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <span
      className={`text-sm font-medium px-3 py-1 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
