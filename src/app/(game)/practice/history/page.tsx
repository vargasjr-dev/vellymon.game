import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import { getPracticeHistory } from "~/data/getPracticeHistory.server";
import type { PracticeHistoryRow } from "~/data/getPracticeHistory.server";

// ─── Rows ─────────────────────────────────────────────────────────────────────

function PlayedMatchRow({ match }: { match: Extract<PracticeHistoryRow, { type: "played" }> }) {
  const date = match.completedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const resultColor =
    match.result === "win"
      ? "text-green-600"
      : match.result === "loss"
        ? "text-red-500"
        : "text-gray-500";
  const resultLabel =
    match.result === "win" ? "Win" : match.result === "loss" ? "Loss" : "Draw";

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <span className={`shrink-0 text-sm font-bold w-10 text-center ${resultColor}`}>
        {resultLabel}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          vs. {match.opponentProfileName ?? "AI"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {match.turns} turn{match.turns !== 1 ? "s" : ""} · {match.enemyKOs} KO
          {match.enemyKOs !== 1 ? "s" : ""} · {date}
        </p>
      </div>
      <Link
        href={`/matches/${match.uuid}/spectate`}
        className="shrink-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
      >
        Watch →
      </Link>
    </div>
  );
}

function SimulatedMatchRow({
  match,
}: {
  match: Extract<PracticeHistoryRow, { type: "simulated" }>;
}) {
  const date = match.completedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const winnerName =
    match.winner === 1
      ? match.p1Name
      : match.winner === 2
        ? match.p2Name
        : null;

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <span className="shrink-0 text-xs font-bold w-10 text-center text-purple-500">
        Sim
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {match.p1Name ?? "?"} vs. {match.p2Name ?? "?"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {winnerName ? (
            <><span className="text-gray-600 font-medium">{winnerName}</span> won · </>
          ) : (
            "Draw · "
          )}
          {match.turns} turn{match.turns !== 1 ? "s" : ""} · {date}
        </p>
      </div>
      <Link
        href={`/matches/${match.uuid}/spectate`}
        className="shrink-0 bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-700 transition"
      >
        Watch →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PracticeHistoryPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const { rows, summary } = await getPracticeHistory(session.user.id);

  const totalAll = summary.totalPlayed + summary.totalSimulated;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/practice" className="text-sm text-blue-600 hover:underline">
          ← Practice
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🥊</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practice History</h1>
          <p className="text-sm text-gray-500">
            {totalAll === 0
              ? "No practice activity yet."
              : [
                  summary.totalPlayed > 0 &&
                    `${summary.totalPlayed} match${summary.totalPlayed === 1 ? "" : "es"} played`,
                  summary.totalSimulated > 0 &&
                    `${summary.totalSimulated} simulation${summary.totalSimulated === 1 ? "" : "s"} run`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
      </div>

      {/* Summary banner — played matches only */}
      {summary.totalPlayed > 0 && (
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
          <p className="text-4xl mb-3">🥊</p>
          <p className="font-semibold text-gray-900 mb-1">No practice activity yet</p>
          <p className="text-sm text-gray-500 mb-6">
            Play against a profile or run a simulation to see history here.
          </p>
          <Link
            href="/practice"
            className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition text-sm"
          >
            Start Practicing
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((match) =>
            match.type === "played" ? (
              <PlayedMatchRow key={match.uuid} match={match} />
            ) : (
              <SimulatedMatchRow key={match.uuid} match={match} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
