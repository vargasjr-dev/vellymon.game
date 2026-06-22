import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { db } from "../../../../../data/db";
import { matchSnapshot } from "../../../../../data/schema";
import { isNotNull, and, gte, sql } from "drizzle-orm";

/** Mirror of DAILY_SIMULATE_LIMIT in /api/practice/simulate/route.ts */
const DAILY_SIMULATE_LIMIT = 10;

export default async function UsagePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) notFound();

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Overall totals
  const [totals7d] = await db
    .select({
      count: sql<number>`count(*)::int`,
      avgMs: sql<number>`round(avg(${matchSnapshot.simulationMs}))::int`,
      totalMs: sql<number>`sum(${matchSnapshot.simulationMs})::int`,
    })
    .from(matchSnapshot)
    .where(
      and(
        isNotNull(matchSnapshot.triggeredByUserId),
        gte(matchSnapshot.uploadedAt, last7d),
      ),
    );

  const [totals30d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matchSnapshot)
    .where(
      and(
        isNotNull(matchSnapshot.triggeredByUserId),
        gte(matchSnapshot.uploadedAt, last30d),
      ),
    );

  // Per-user breakdown (last 30 days)
  const perUser = await db
    .select({
      userId: matchSnapshot.triggeredByUserId,
      total: sql<number>`count(*)::int`,
      last24h: sql<number>`count(*) filter (where ${matchSnapshot.uploadedAt} >= ${last24h})::int`,
      avgMs: sql<number>`round(avg(${matchSnapshot.simulationMs}))::int`,
      lastMatch: sql<Date>`max(${matchSnapshot.uploadedAt})`,
    })
    .from(matchSnapshot)
    .where(
      and(
        isNotNull(matchSnapshot.triggeredByUserId),
        gte(matchSnapshot.uploadedAt, last30d),
      ),
    )
    .groupBy(matchSnapshot.triggeredByUserId)
    .orderBy(sql`count(*) desc`);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Admin
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Simulation Usage</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Per-user automated match stats for Practice Mode.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totals7d.count ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Simulations (7d)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totals30d.count ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Simulations (30d)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">
            {totals7d.avgMs ? `${totals7d.avgMs}ms` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Avg sim time (7d)</p>
        </div>
      </div>

      {/* Rate limit reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
        <span className="font-semibold">Rate limit:</span> {DAILY_SIMULATE_LIMIT}{" "}
        simulations per subscriber per 24-hour window. Adjust{" "}
        <code className="font-mono bg-amber-100 px-1 rounded">
          DAILY_SIMULATE_LIMIT
        </code>{" "}
        in{" "}
        <code className="font-mono bg-amber-100 px-1 rounded">
          src/app/api/practice/simulate/route.ts
        </code>{" "}
        to change.
      </div>

      {/* Per-user table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Per-User Breakdown{" "}
          <span className="text-sm font-normal text-gray-400">(last 30 days)</span>
        </h2>

        {perUser.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            No user-triggered simulations yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User ID
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    30d Total
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Used Today
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Avg ms
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Last Match
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perUser.map((row) => {
                  const nearLimit = (row.last24h ?? 0) >= DAILY_SIMULATE_LIMIT * 0.8;
                  const atLimit = (row.last24h ?? 0) >= DAILY_SIMULATE_LIMIT;
                  return (
                    <tr key={row.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[180px] truncate">
                        {row.userId}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {row.total}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            atLimit
                              ? "text-red-600"
                              : nearLimit
                                ? "text-amber-600"
                                : "text-gray-700"
                          }`}
                        >
                          {row.last24h ?? 0}
                        </span>
                        <span className="text-gray-400 text-xs"> / {DAILY_SIMULATE_LIMIT}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {row.avgMs ? `${row.avgMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {row.lastMatch
                          ? new Date(row.lastMatch).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
