import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import getTeams from "~/data/getTeams.server";
import TeamCard from "./TeamCard";

export default async function TeamsPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const teams = await getTeams(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Teams</h1>
          <p className="text-gray-600 mt-1">
            {teams.length} team{teams.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link
          href="/teams/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
        >
          + New Team
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">⚔️</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No teams yet
          </h2>
          <p className="text-gray-600 mb-6">
            Build a team of 8 vellymons with 4 in your active lineup to compete
            in matches.
          </p>
          <Link
            href="/teams/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Create Your First Team
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.uuid} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
