import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getVellymonRoster from "~/data/getVellymonRoster.server";
import getTeams from "~/data/getTeams.server";
import getUserMatches from "~/data/getUserMatches.server";
import { getSubscriptionInfo } from "../../../../lib/subscription";
import SubscriptionCard from "~/components/SubscriptionCard";
import { getActiveRank, STARS_PER_RANK, type Rank } from "../../../../lib/ranked";
import { getBalance } from "../../../../lib/currency";

// ─── Rank helpers ─────────────────────────────────────────────────────────────

const RANK_EMOJI: Record<Rank, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💠",
  diamond: "💎",
  legend: "👑",
};

const RANK_COLOR: Record<Rank, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-500",
  gold: "text-yellow-600",
  platinum: "text-cyan-600",
  diamond: "text-blue-500",
  legend: "text-purple-600",
};

const RANK_BG: Record<Rank, string> = {
  bronze: "from-amber-50 to-orange-50 border-amber-200",
  silver: "from-slate-50 to-gray-100 border-slate-300",
  gold: "from-yellow-50 to-amber-50 border-yellow-300",
  platinum: "from-cyan-50 to-teal-50 border-cyan-300",
  diamond: "from-blue-50 to-indigo-50 border-blue-300",
  legend: "from-purple-50 to-pink-50 border-purple-300",
};

function StarRow({ stars, max }: { stars: number; max: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-base ${i < stars ? "opacity-100" : "opacity-20"}`}>
          ⭐
        </span>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayerHubPage() {
  const headersList = await headers();
  // Session guaranteed by (game)/layout.tsx auth gate
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [roster, teams, matches, subInfo, activeRank, creditBalance] = await Promise.all([
    getVellymonRoster(session.user.id),
    getTeams(session.user.id),
    getUserMatches(session.user.id),
    getSubscriptionInfo(session.user.id),
    getActiveRank(session.user.id),
    getBalance(session.user.id),
  ]);
  const activeMatchCount = matches.filter(
    (m) => m.status === "waiting" || m.status === "ready" || m.status === "playing",
  ).length;
  const displayName = session.user.name || "Trainer";

  const rank = (activeRank?.rank ?? "bronze") as Rank;
  const stars = activeRank?.stars ?? 0;
  const maxStars = STARS_PER_RANK[rank];
  const gamesPlayed = activeRank?.gamesPlayed ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {displayName}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s your Vellymon overview.
        </p>
      </div>

      {/* Rank + Currency Banner */}
      <div className={`mb-8 bg-gradient-to-br ${RANK_BG[rank]} border-2 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
        {/* Rank section */}
        <div className="flex-1 flex items-center gap-4">
          <span className="text-5xl" aria-label={rank}>{RANK_EMOJI[rank]}</span>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
              Ranked Season
            </p>
            <p className={`text-2xl font-bold capitalize ${RANK_COLOR[rank]}`}>
              {rank}
            </p>
            {rank !== "legend" && maxStars !== Infinity ? (
              <StarRow stars={stars} max={maxStars} />
            ) : (
              <p className="text-xs text-purple-500 mt-1 font-semibold">
                #{activeRank?.mmr ?? 1000} MMR
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {gamesPlayed} ranked match{gamesPlayed !== 1 ? "es" : ""} played
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-16 bg-gray-200" />

        {/* Credits section */}
        <div className="flex items-center gap-3 sm:pr-2">
          <span className="text-4xl">💰</span>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
              Credits
            </p>
            <p className="text-2xl font-bold text-gray-800">{creditBalance.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Earn from every match</p>
          </div>
        </div>

        {/* Ranked link */}
        <Link
          href="/matches"
          className="sm:self-center px-4 py-2 bg-white/70 hover:bg-white rounded-lg text-sm font-semibold text-gray-700 hover:text-blue-600 border border-gray-200 transition whitespace-nowrap shadow-sm"
        >
          Play Ranked →
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Roster Card */}
        <Link
          href="/roster"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎮</span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
              Roster
            </h2>
          </div>
          <p className="text-3xl font-bold text-blue-600">{roster.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {roster.length === 0
              ? "Visit the Market to get started"
              : `vellymon${roster.length !== 1 ? "s" : ""} collected`}
          </p>
        </Link>

        {/* Teams Card */}
        <Link
          href="/teams"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚔️</span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
              Teams
            </h2>
          </div>
          <p className="text-3xl font-bold text-blue-600">{teams.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {teams.length === 0
              ? "Create a team to compete"
              : `team${teams.length !== 1 ? "s" : ""} built`}
          </p>
        </Link>

        {/* Matches Card */}
        <Link
          href="/matches"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏆</span>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
              Matches
            </h2>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {activeMatchCount}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {activeMatchCount === 0
              ? "Start or join a match"
              : `active match${activeMatchCount !== 1 ? "es" : ""}`}
          </p>
        </Link>
      </div>

      {/* Subscription */}
      <div className="mb-8">
        <SubscriptionCard
          subscriptionStatus={subInfo?.subscriptionStatus ?? "none"}
          subscriptionStreakMonths={subInfo?.subscriptionStreakMonths ?? 0}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/practice"
          className={`rounded-lg shadow-md p-6 hover:shadow-lg transition group text-center ${
            subInfo?.subscriptionStatus === "active"
              ? "bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200"
              : "bg-gray-50 border-2 border-gray-200"
          }`}
        >
          <p className="text-3xl mb-2">🤖</p>
          <p className="font-semibold text-gray-900 group-hover:text-purple-600">
            AI Sparring
            {subInfo?.subscriptionStatus !== "active" && (
              <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                PRO
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {subInfo?.subscriptionStatus === "active"
              ? "Practice against AI opponents"
              : "Subscribe to unlock AI practice"}
          </p>
        </Link>
        <Link
          href="/market"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group text-center"
        >
          <p className="text-3xl mb-2">🏪</p>
          <p className="font-semibold text-gray-900 group-hover:text-blue-600">
            Visit Market
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Browse and collect vellymons
          </p>
        </Link>
        <Link
          href="/guide"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group text-center"
        >
          <p className="text-3xl mb-2">📖</p>
          <p className="font-semibold text-gray-900 group-hover:text-blue-600">
            Game Guide
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Rules, strategy, and vellymon directory
          </p>
        </Link>
      </div>
    </div>
  );
}
