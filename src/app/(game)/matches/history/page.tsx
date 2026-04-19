import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getMatchHistory from "~/data/getMatchHistory.server";
import MatchCard from "../MatchCard";

export default async function MatchHistoryPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const history = await getMatchHistory(session.user.id);

  const completedMatches = history.filter((m) => m.status === "completed");
  const cancelledMatches = history.filter((m) => m.status === "cancelled");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/matches"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 inline-block"
        >
          ← Back to Matches
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Match History</h1>
        <p className="text-gray-600 mt-1">
          {history.length === 0
            ? "No matches played yet."
            : `${history.length} match${history.length === 1 ? "" : "es"} total — ${completedMatches.length} completed, ${cancelledMatches.length} cancelled.`}
        </p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">📜</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No history yet
          </h2>
          <p className="text-gray-600 mb-6">
            Play some matches and your results will appear here.
          </p>
          <Link
            href="/matches"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Find a Match
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Completed Matches */}
          {completedMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                Completed ({completedMatches.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedMatches.map((match) => (
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

          {/* Cancelled Matches */}
          {cancelledMatches.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Cancelled ({cancelledMatches.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cancelledMatches.map((match) => (
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
        </div>
      )}
    </div>
  );
}
