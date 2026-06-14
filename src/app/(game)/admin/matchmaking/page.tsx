import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "../../../../../data/db";
import { gameSession, gamePlayer, user, team } from "../../../../../data/schema";
import { eq, and } from "drizzle-orm";

export default async function MatchmakingLobbyPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) notFound();

  // All waiting matches with creator info and team name
  const waitingMatches = await db
    .select({
      uuid: gameSession.uuid,
      createdAt: gameSession.createdAt,
      creatorName: user.name,
      teamName: team.name,
      metadata: gameSession.metadata,
    })
    .from(gameSession)
    .leftJoin(user, eq(gameSession.createdBy, user.id))
    .leftJoin(
      gamePlayer,
      and(
        eq(gamePlayer.gameSessionUuid, gameSession.uuid),
        eq(gamePlayer.userId, gameSession.createdBy),
      ),
    )
    .leftJoin(team, eq(gamePlayer.teamUuid, team.uuid))
    .where(eq(gameSession.status, "waiting"))
    .orderBy(gameSession.createdAt);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🎮 Matchmaking Lobby
          </h1>
          <p className="text-gray-600 mt-1">
            Players waiting for an opponent.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Admin
        </Link>
      </div>

      {waitingMatches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-5xl mb-4">🏟️</p>
          <p className="text-xl font-bold text-gray-900 mb-2">Lobby is empty</p>
          <p className="text-gray-500 text-sm">
            No players are currently waiting for a match.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitingMatches.map((m) => {
            const meta = m.metadata as {
              matchSettings?: { timerSeconds?: number; mapId?: string };
            } | null;
            const settings = meta?.matchSettings;
            const waitingSince = m.createdAt
              ? Math.round(
                  (Date.now() - new Date(m.createdAt).getTime()) / 1000 / 60,
                )
              : null;

            return (
              <div
                key={m.uuid}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {m.creatorName ?? "Unknown player"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Team: {m.teamName ?? "—"} · Map:{" "}
                    {settings?.mapId ?? "standard"} · Timer:{" "}
                    {settings?.timerSeconds === 0
                      ? "None"
                      : `${settings?.timerSeconds ?? 30}s`}
                  </p>
                  {waitingSince !== null && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Waiting {waitingSince} min
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 hidden sm:block">
                    {m.uuid.slice(0, 8)}…
                  </span>
                  <Link
                    href={`/matches/${m.uuid}`}
                    className="shrink-0 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        {waitingMatches.length} player{waitingMatches.length !== 1 ? "s" : ""}{" "}
        in lobby · refreshes on page load
      </p>
    </div>
  );
}
