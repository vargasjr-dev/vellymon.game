import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { listAiProfiles } from "~/data/aiProfiles.server";
import NewMatchClient from "./NewMatchClient";

export default async function NewMatchPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) notFound();

  const profiles = await listAiProfiles();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Admin
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚔️ New Match</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Pick two participants. Profile vs profile runs a simulation and saves
            a replay. Mix in random for quick playtesting.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <NewMatchClient profiles={profiles} />
      </div>
    </div>
  );
}
