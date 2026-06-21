import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import { getMatchHistoryWithStats } from "~/data/getMatchHistoryWithStats.server";
import type { EnrichedMatchRow } from "~/data/getMatchHistoryWithStats.server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function opponentDisplay(match: EnrichedMatchRow): string {
  if (match.isSparring) {
    if (match.aiDifficulty)
      return `${match.aiDifficulty.charAt(0).toUpperCase() + match.aiDifficulty.slice(1)} AI`;
    return "AI";
  }
  return match.opponentName ?? "Unknown Trainer";
}

function matchHeadline(match: EnrichedMatchRow): string {
  const me = match.myName ?? "You";
  const opp = opponentDisplay(match);
  if (match.result === "win") return `${me} defeats ${opp}`;
  if (match.result === "loss") return `${opp} defeats ${me}`;
  return `${me} ties ${opp}`;
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: EnrichedMatchRow }) {
  const date = match.completedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate text-sm">
          {matchHeadline(match)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{date}</p>
      </div>
      <Link
        href={`/matches/${match.uuid}/spectate`}
        className="shrink-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
      >
        Spectate →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RankedHistoryPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const myName = session.user.name ?? null;
  const { rows, summary } = await getMatchHistoryWithStats(
    session.user.id,
    myName,
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/ranked" className="text-sm text-blue-600 hover:underline">
          ← Back to Ranked
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📜</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Match History</h1>
          <p className="text-sm text-gray-500">
            {summary.total === 0
              ? "No completed matches yet."
              : `${summary.total} match${summary.total === 1 ? "" : "es"} played`}
          </p>
        </div>
      </div>

      {/* Summary banner */}
      {summary.total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              W / L
            </p>
            <p className="text-lg font-bold text-gray-900">
              <span className="text-green-600">{summary.wins}</span>
              <span className="text-gray-400 font-normal"> / </span>
              <span className="text-red-500">{summary.losses}</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              Win %
            </p>
            <p className="text-lg font-bold text-gray-900">
              {summary.winRate}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              KOs
            </p>
            <p className="text-lg font-bold text-gray-900">
              {summary.totalKOs}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              Draws
            </p>
            <p className="text-lg font-bold text-gray-900">{summary.draws}</p>
          </div>
        </div>
      )}

      {/* Match list */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🎮</p>
          <p className="font-semibold text-gray-900 mb-1">No matches yet</p>
          <p className="text-sm text-gray-500 mb-6">
            Complete a match to see your stats here.
          </p>
          <Link
            href="/ranked"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
          >
            Play Now →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((match) => (
            <MatchRow key={match.uuid} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
