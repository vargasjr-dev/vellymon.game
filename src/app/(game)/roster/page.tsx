import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getVellymonRoster from "~/data/getVellymonRoster.server";
import RosterGrid from "./RosterGrid";

export default async function RosterPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const roster = await getVellymonRoster(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Roster</h1>
          <p className="text-gray-600 mt-1">
            {roster.length} vellymon{roster.length !== 1 ? "s" : ""} collected
          </p>
        </div>
        <Link
          href="/market"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
        >
          Visit Market
        </Link>
      </div>

      {roster.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">🥚</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No vellymons yet
          </h2>
          <p className="text-gray-600 mb-6">
            Head to the Market to collect your first vellymon and start building
            your roster.
          </p>
          <Link
            href="/market"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Visit the Market
          </Link>
        </div>
      ) : (
        <RosterGrid
          roster={roster.map((v) => ({
            uuid: v.uuid,
            name: v.name,
            health: v.health,
            attack: v.attack,
            speed: v.speed,
            energy: v.energy,
          }))}
        />
      )}
    </div>
  );
}
