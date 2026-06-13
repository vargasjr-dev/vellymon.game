import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import {
  getAiProfile,
  listAiProfiles,
  getMatchesForProfile,
  getHeadToHead,
  type ProfileMatch,
} from "~/data/aiProfiles.server";
import ProfileDeleteButton from "../ProfileDeleteButton";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) notFound();

  const { id } = await params;
  const [profile, allProfiles, matches] = await Promise.all([
    getAiProfile(id),
    listAiProfiles(),
    getMatchesForProfile(id),
  ]);

  if (!profile) notFound();

  const otherProfiles = allProfiles.filter((p) => p.id !== id);

  // W/L/D record
  let wins = 0, losses = 0, draws = 0;
  for (const m of matches) {
    if (!m.winner) { draws++; continue; }
    const isP1 = m.p1ProfileId === id;
    if ((isP1 && m.winner === 1) || (!isP1 && m.winner === 2)) wins++;
    else losses++;
  }

  // Head-to-head against each other profile
  const h2h = await Promise.all(
    otherProfiles.map(async (opp) => ({
      opp,
      ...(await getHeadToHead(id, opp.id)),
    })),
  );
  const h2hWithGames = h2h.filter((r) => r.wins + r.losses + r.draws > 0);

  const teamNames = profile.teamNames as string[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/profiles"
            className="text-gray-500 hover:text-gray-700 text-sm shrink-0"
          >
            ← Profiles
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
          <span className="text-xs font-mono bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
            {profile.id}
          </span>
        </div>
        <ProfileDeleteButton profileId={profile.id} profileName={profile.name} />
      </div>

      {/* Profile details card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-5">

        {/* Prompt */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Prompt
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {profile.description || <span className="italic text-gray-400">No prompt set</span>}
          </p>
        </div>

        {/* Randomness */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Randomness
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${((typeof profile.randomness === "number" ? profile.randomness : 0.5)) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-mono text-gray-600 w-8 text-right">
              {typeof profile.randomness === "number"
                ? profile.randomness.toFixed(2)
                : "0.50"}
            </span>
          </div>
        </div>

        {/* Team */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Team ({teamNames.length} mons)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {teamNames.map((name, i) => (
              <span
                key={i}
                className="text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Record */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Record
          </p>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{wins}</p>
              <p className="text-xs text-gray-400">W</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{losses}</p>
              <p className="text-xs text-gray-400">L</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{draws}</p>
              <p className="text-xs text-gray-400">D</p>
            </div>
          </div>
        </div>

        {/* Head-to-head */}
        {h2hWithGames.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Head-to-head
            </p>
            <div className="space-y-1.5">
              {h2hWithGames.map(({ opp, wins: w, losses: l, draws: d }) => (
                <div key={opp.id} className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/admin/profiles/${opp.id}`}
                    className="text-blue-600 hover:underline w-32 truncate shrink-0"
                  >
                    {opp.name}
                  </Link>
                  <span className="text-green-600 font-medium">{w}W</span>
                  <span className="text-red-500 font-medium">{l}L</span>
                  <span className="text-gray-400">{d}D</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Match history */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Match History{" "}
          <span className="text-sm font-normal text-gray-400">
            ({matches.length})
          </span>
        </h2>

        {matches.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            No matches yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {matches.map((m) => {
              const isP1 = m.p1ProfileId === id;
              const outcomeLabel = !m.winner
                ? "Draw"
                : (isP1 && m.winner === 1) || (!isP1 && m.winner === 2)
                  ? "Win"
                  : "Loss";
              const outcomeColor =
                outcomeLabel === "Win"
                  ? "text-green-600 bg-green-50"
                  : outcomeLabel === "Loss"
                    ? "text-red-600 bg-red-50"
                    : "text-gray-500 bg-gray-100";

              const oppId = isP1 ? m.p2ProfileId : m.p1ProfileId;
              const opp = allProfiles.find((p) => p.id === oppId);

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 bg-white gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${outcomeColor}`}
                    >
                      {outcomeLabel}
                    </span>
                    <span className="text-sm text-gray-500 shrink-0">
                      vs{" "}
                      {opp ? (
                        <Link
                          href={`/admin/profiles/${opp.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {opp.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400 italic">unknown</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {m.turns} turns
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(m.uploadedAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/matches/${m.id}/spectate`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Spectate →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
