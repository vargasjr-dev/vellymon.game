import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import { getMatchHistoryWithStats } from "~/data/getMatchHistoryWithStats.server";
import type { EnrichedMatchRow } from "~/data/getMatchHistoryWithStats.server";

// ─── Result badge ─────────────────────────────────────────────────────────────

const RESULT_STYLE = {
  win: "bg-green-100 text-green-700 border-green-200",
  loss: "bg-red-100 text-red-700 border-red-200",
  draw: "bg-gray-100 text-gray-600 border-gray-200",
};

const RESULT_LABEL = { win: "WIN", loss: "LOSS", draw: "DRAW" };

const WIN_CONDITION_LABEL: Record<string, string> = {
  elimination: "Elimination",
  occupation: "Occupation",
  accumulation: "Accumulation",
  concession: "Concession",
};

function MatchRow({ match }: { match: EnrichedMatchRow }) {
  const date = match.completedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = match.completedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const opponentDisplay = match.isSparring
    ? match.aiDifficulty
      ? `🤖 ${match.aiDifficulty.charAt(0).toUpperCase() + match.aiDifficulty.slice(1)} AI`
      : "🤖 AI"
    : (match.opponentName ?? "Unknown Trainer");

  const wc = match.winCondition
    ? WIN_CONDITION_LABEL[match.winCondition] ?? match.winCondition
    : null;

  return (
    <Link
      href={`/matches/${match.uuid}`}
      className="flex items-center gap-3 sm:gap-4 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition group"
    >
      {/* Result badge */}
      <div
        className={`w-14 shrink-0 text-center text-xs font-bold py-1.5 rounded-lg border ${RESULT_STYLE[match.result]}`}
      >
        {RESULT_LABEL[match.result]}
      </div>

      {/* Match info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">
          vs {opponentDisplay}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {date} · {time}
          {wc && ` · ${wc}`}
          {match.turns > 0 && ` · ${match.turns} turns`}
        </p>
      </div>

      {/* KO stats */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-900">
          {match.enemyKOs}
          <span className="text-gray-400 font-normal"> / {match.ownKOs}</span>
        </p>
        <p className="text-xs text-gray-400">KO for/against</p>
      </div>

      {/* Arrow */}
      <span className="text-gray-300 group-hover:text-blue-400 transition text-sm shrink-0">
        →
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MatchHistoryPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const { rows, summary } = await getMatchHistoryWithStats(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/matches"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Matches
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
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">W / L</p>
            <p className="text-lg font-bold text-gray-900">
              <span className="text-green-600">{summary.wins}</span>
              <span className="text-gray-400 font-normal"> / </span>
              <span className="text-red-500">{summary.losses}</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Win %</p>
            <p className="text-lg font-bold text-gray-900">{summary.winRate}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">KOs</p>
            <p className="text-lg font-bold text-gray-900">{summary.totalKOs}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Draws</p>
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
            href="/matches"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
          >
            Find a Match
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
