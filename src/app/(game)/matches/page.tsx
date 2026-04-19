import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getOpenMatches from "~/data/getOpenMatches.server";
import getUserMatches from "~/data/getUserMatches.server";
import MatchCard from "./MatchCard";

export default async function MatchesPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [openMatches, myMatches] = await Promise.all([
    getOpenMatches(),
    getUserMatches(session.user.id),
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
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Match History
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPastMatches.map((match) => (
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
  );
}
