import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getOpenMatches from "~/data/getOpenMatches.server";
import getUserMatches from "~/data/getUserMatches.server";
import MatchCard from "./MatchCard";
import { db } from "../../../../data/db";
import { matchSnapshot } from "../../../../data/schema";
import { desc } from "drizzle-orm";

export default async function MatchesPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const isAdmin = (session.user as { role?: string }).role === "admin";

  const [openMatches, myMatches, uploadedSnapshots] = await Promise.all([
    getOpenMatches(),
    getUserMatches(session.user.id),
    isAdmin
      ? db.select({ id: matchSnapshot.id, status: matchSnapshot.status, uploadedAt: matchSnapshot.uploadedAt }).from(matchSnapshot).orderBy(desc(matchSnapshot.uploadedAt))
      : Promise.resolve([]),
  ]);

  // Separate user's active matches from history
  const myActiveMatches = myMatches.filter(
    (m) => m.status === "waiting" || m.status === "ready" || m.status === "playing",
  );
  const myPastMatches = myMatches.filter(
    (m) => m.status === "completed" || m.status === "cancelled",
  );

  // Open matches that aren't the user's own
  const joinableMatches = openMatches.filter(
    (m) => m.createdBy !== session.user.id,
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
          <p className="text-gray-600 mt-1">
            Browse open games or create your own.
          </p>
        </div>
        <Link
          href="/matches/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
        >
          + Create Match
        </Link>
      </div>

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

      {/* Open Matches to Join */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Open Matches
        </h2>
        {joinableMatches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-5xl mb-4">🏟️</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No open matches
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create a match and wait for an opponent!
            </p>
            <Link
              href="/matches/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create a Match
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinableMatches.map((match) => (
              <MatchCard
                key={match.uuid}
                match={match}
                currentUserId={session.user.id}
                variant="joinable"
              />
            ))}
          </div>
        )}
      </section>

      {/* Match History */}
      {myPastMatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Match History
            </h2>
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
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold align-middle">ADMIN</span>
            </h2>
            <span className="text-sm text-gray-500">
              {uploadedSnapshots.length} snapshot{uploadedSnapshots.length !== 1 ? "s" : ""}
            </span>
          </div>
          {uploadedSnapshots.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-400 text-sm">
              No uploaded snapshots yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedSnapshots.map((snap) => (
                <div key={snap.id} className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                  <div>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
                      snap.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {snap.status ?? "unknown"}
                    </span>
                    <span className="text-sm font-mono text-gray-700">{snap.id}</span>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {snap.uploadedAt
                        ? new Date(snap.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  <Link
                    href={`/matches/${snap.id}/spectate`}
                    className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Spectate →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
