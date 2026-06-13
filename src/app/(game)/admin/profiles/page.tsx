import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { listAiProfiles } from "~/data/aiProfiles.server";
import { VELLYMON_LIBRARY } from "../../../../../server/vellymonLibrary";
import ProfileCreateForm from "./ProfileCreateForm";
import ProfileDeleteButton from "./ProfileDeleteButton";

export default async function ProfilesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!isAdmin(session)) notFound();

  const profiles = await listAiProfiles();
  const allNames = VELLYMON_LIBRARY.map((v) => v.name).sort();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Admin
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 AI Player Profiles</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Named AI personas for automated playtesting. Each profile has a fixed team + difficulty tier.
          </p>
        </div>
      </div>

      {/* Existing profiles */}
      {profiles.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500 mb-8">
          No profiles yet. Create one below.
        </div>
      ) : (
        <div className="grid gap-4 mb-8">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{p.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-mono">
                    {p.id}
                  </span>
                  <span
                    className={`text-xs rounded px-1.5 py-0.5 font-medium ${
                      p.aiDifficulty === "hard"
                        ? "bg-red-100 text-red-700"
                        : p.aiDifficulty === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {p.aiDifficulty}
                  </span>
                </div>
                {p.description && (
                  <p className="text-sm text-gray-500 mb-2">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(p.teamNames as string[]).map((name, i) => (
                    <span
                      key={i}
                      className={`text-xs rounded px-1.5 py-0.5 ${
                        i < 4
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-50 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {name}
                      {i >= 4 && <span className="ml-0.5 opacity-60">bench</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/profiles/${p.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  History →
                </Link>
                <ProfileDeleteButton profileId={p.id} profileName={p.name} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Profile</h2>
        <ProfileCreateForm allVellymonNames={allNames} />
      </div>
    </div>
  );
}
