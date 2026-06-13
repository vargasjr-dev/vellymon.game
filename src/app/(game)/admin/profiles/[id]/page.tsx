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

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) notFound();

  const { id } = await params;
  const profile = await getAiProfile(id);
  if (!profile) notFound();

  const [allProfiles, matches] = await Promise.all([
    listAiProfiles(),
    getMatchesForProfile(id),
  ]);

  // Compute head-to-head record against every other profile that has played this one
  const opponentIds = [
    ...new Set(
      matches.flatMap((m) => [m.p1ProfileId, m.p2ProfileId]).filter((pid): pid is string => !!pid && pid !== id),
    ),
  ];

  const h2hEntries = await Promise.all(
    opponentIds.map(async (oppId) => {
      const opp = allProfiles.find((p) => p.id === oppId);
      const record = await getHeadToHead(id, oppId);
      return { oppId, oppName: opp?.name ?? oppId, ...record };
    }),
  );

  const totalWins = matches.filter(
    (m) => (m.p1ProfileId === id && m.winner === 1) || (m.p2ProfileId === id && m.winner === 2),
  ).length;
  const totalLosses = matches.filter(
    (m) => (m.p1ProfileId === id && m.winner === 2) || (m.p2ProfileId === id && m.winner === 1),
  ).length;
  const totalDraws = matches.filter((m) => m.winner === null).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/profiles" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Profiles
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-gray-500">{profile.id}</span>
            <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">
              🎲 {typeof profile.randomness === "number" ? profile.randomness.toFixed(2) : "0.50"} randomness
            </span>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Team</h2>
        <div className="flex flex-wrap gap-1.5">
          {(profile.teamNames as string[]).map((name, i) => (
            <span
              key={i}
              className={`text-sm rounded px-2 py-1 ${
                i < 4
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
              }`}
            >
              {name}
              {i >= 4 && <span className="ml-1 text-xs opacity-60">bench</span>}
            </span>
          ))}
        </div>
        {profile.description && (
          <p className="text-sm text-gray-500 mt-2">{profile.description}</p>
        )}
      </div>

      {/* Overall record */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Wins", value: totalWins, color: "text-green-600" },
          { label: "Losses", value: totalLosses, color: "text-red-600" },
          { label: "Draws", value: totalDraws, color: "text-gray-500" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white border border-gray-200 rounded-xl p-4 text-center"
          >
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Head-to-head table */}
      {h2hEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Head-to-Head</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Opponent</th>
                <th className="text-center pb-2 font-medium">W</th>
                <th className="text-center pb-2 font-medium">L</th>
                <th className="text-center pb-2 font-medium">D</th>
              </tr>
            </thead>
            <tbody>
              {h2hEntries.map((e) => (
                <tr key={e.oppId} className="border-b border-gray-50 last:border-0">
                  <td className="py-2">
                    <Link
                      href={`/admin/profiles/${e.oppId}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {e.oppName}
                    </Link>
                  </td>
                  <td className="text-center text-green-600 font-medium">{e.wins}</td>
                  <td className="text-center text-red-500 font-medium">{e.losses}</td>
                  <td className="text-center text-gray-400">{e.draws}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Match history */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Match History ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            No matches yet. Run{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">
              bun scripts/auto-match.ts --p1 {profile.id} --p2 &lt;otherId&gt;
            </code>
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => {
              const isP1 = m.p1ProfileId === id;
              const mySlot = isP1 ? 1 : 2;
              const oppProfileId = isP1 ? m.p2ProfileId : m.p1ProfileId;
              const oppProfile = allProfiles.find((p) => p.id === oppProfileId);
              const result =
                m.winner === null
                  ? "draw"
                  : m.winner === mySlot
                    ? "win"
                    : "loss";

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-10 text-center text-xs font-semibold rounded px-1 py-0.5 ${
                        result === "win"
                          ? "bg-green-100 text-green-700"
                          : result === "loss"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {result === "win" ? "W" : result === "loss" ? "L" : "D"}
                    </span>
                    <span className="text-gray-600">
                      vs{" "}
                      {oppProfile ? (
                        <Link
                          href={`/admin/profiles/${oppProfile.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {oppProfile.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">{oppProfileId ?? "unknown"}</span>
                      )}
                    </span>
                    <span className="text-gray-400 text-xs">{m.turns} turns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(m.uploadedAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/matches/${m.id}/spectate`}
                      className="text-xs text-blue-600 hover:text-blue-800"
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
