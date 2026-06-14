import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getTeams from "~/data/getTeams.server";
import getUserMatches from "~/data/getUserMatches.server";
import MatchCard from "./MatchCard";
import MatchmakingLobby from "./MatchmakingLobby";
import { db } from "../../../../data/db";
import { matchSnapshot } from "../../../../data/schema";
import { desc } from "drizzle-orm";

export default async function MatchesPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const isAdmin = (session.user as { role?: string }).role === "admin";

  const [teams, myMatches, uploadedSnapshots] = await Promise.all([
    getTeams(session.user.id),
    getUserMatches(session.user.id),
    isAdmin
      ? db
          .select({
            id: matchSnapshot.id,
            gameState: matchSnapshot.gameState,
            uploadedAt: matchSnapshot.uploadedAt,
          })
          .from(matchSnapshot)
          .orderBy(desc(matchSnapshot.uploadedAt))
      : Promise.resolve([]),
  ]);

  // Only teams with at least 4 active vellymons can enter a match
  const eligibleTeams = teams.filter((t) => t.activeCount >= 4);

  // Separate user's active matches from history
  const myActiveMatches = myMatches.filter(
    (m) =>
      m.status === "waiting" || m.status === "ready" || m.status === "playing",
  );
  const myPastMatches = myMatches.filter(
    (m) => m.status === "completed" || m.status === "cancelled",
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
        <p className="text-gray-600 mt-1">
          Pick your team and jump in — we&apos;ll find you an opponent.
        </p>
      </div>

      {/* Matchmaking */}
      <MatchmakingLobby teams={eligibleTeams} />

      {/* Active Matches */}
      {myActiveMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Your Active Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myActiveMatches.map((match) => (
              <MatchCard
                key={match.uuid}
                match={match}
                currentUserId={session.user.id}
                variant="active"
              />
            ))}
          </div>
        </section>
      )}

      {/* Match History */}
      {myPastMatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Match History</h2>
            <Link
              href="/matches/history"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPastMatches.slice(0, 4).map((match) => (
              <MatchCard
                key={match.uuid}
                match={match}
                currentUserId={session.user.id}
                variant="history"
              />
            ))}
          </div>
        </section>
      )}

      {/* Admin: Uploaded Match History */}
      {isAdmin && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              🛡️ Uploaded Match History
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold align-middle">
                ADMIN
              </span>
            </h2>
            <span className="text-sm text-gray-500">
              {uploadedSnapshots.length} snapshot
              {uploadedSnapshots.length !== 1 ? "s" : ""}
            </span>
          </div>
          {uploadedSnapshots.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-400 text-sm">
              No uploaded snapshots yet.
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedSnapshots.map((snap) => {
                type SnapTeam = { id: 1 | 2; name: string };
                type SnapResult = { winner: 1 | 2; condition: string } | null;
                const gs =
                  snap.gameState as {
                    teams?: SnapTeam[];
                    result?: SnapResult;
                  } | null;
                const snapTeams = gs?.teams ?? [];
                const result = gs?.result ?? null;
                const winner = result
                  ? snapTeams.find((t) => t.id === result.winner)
                  : null;
                const loser = result
                  ? snapTeams.find((t) => t.id !== result.winner)
                  : null;
                const headline =
                  winner && loser
                    ? `${winner.name} defeats ${loser.name}`
                    : snapTeams.length >= 2
                      ? `${snapTeams[0].name} vs ${snapTeams[1].name}`
                      : "Match";
                const date = snap.uploadedAt
                  ? new Date(snap.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";
                return (
                  <div
                    key={snap.id}
                    className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">
                        {headline}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                    </div>
                    <Link
                      href={`/matches/${snap.id}/spectate`}
                      className="shrink-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                    >
                      Spectate →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
