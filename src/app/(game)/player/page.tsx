import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getVellymonRoster from "~/data/getVellymonRoster.server";

export default async function PlayerHubPage() {
  const headersList = await headers();
  // Session guaranteed by (game)/layout.tsx auth gate
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const roster = await getVellymonRoster(session.user.id);
  const displayName = session.user.name || "Trainer";

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Roster Card */}
        <Link
          href="/market"
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
        <div className="bg-white rounded-lg shadow-md p-6 opacity-75">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚔️</span>
            <h2 className="text-lg font-semibold text-gray-900">Teams</h2>
          </div>
          <p className="text-3xl font-bold text-gray-400">0</p>
          <p className="text-sm text-gray-400 mt-1">Coming soon</p>
        </div>

        {/* Matches Card */}
        <div className="bg-white rounded-lg shadow-md p-6 opacity-75">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏆</span>
            <h2 className="text-lg font-semibold text-gray-900">Matches</h2>
          </div>
          <p className="text-3xl font-bold text-gray-400">0</p>
          <p className="text-sm text-gray-400 mt-1">Coming soon</p>
        </div>
      </div>

      {/* Roster Preview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Your Vellymons</h2>
          {roster.length > 0 && (
            <Link
              href="/market"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Visit Market →
            </Link>
          )}
        </div>

        {roster.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🥚</p>
            <p className="text-lg text-gray-600 mb-4">
              Your roster is empty! Head to the Market to collect your first
              vellymon.
            </p>
            <Link
              href="/market"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Visit the Market
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roster.slice(0, 4).map((vellymon) => (
              <Link
                key={vellymon.uuid}
                href={`/player/${vellymon.uuid}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition group"
              >
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2">
                  {vellymon.name}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-400">HP</span>{" "}
                    <span className="font-semibold">{vellymon.health}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">ATK</span>{" "}
                    <span className="font-semibold">{vellymon.attack}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">SPD</span>{" "}
                    <span className="font-semibold">{vellymon.speed}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">NRG</span>{" "}
                    <span className="font-semibold">{vellymon.energy}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {roster.length > 4 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing 4 of {roster.length} vellymons.{" "}
              <span className="text-gray-400">
                Full roster view coming soon.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
