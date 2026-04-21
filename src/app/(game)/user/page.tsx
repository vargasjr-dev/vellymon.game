import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { isAdmin } from "~/lib/admin";

export default async function UserPage() {
  const headersList = await headers();
  // Session guaranteed by (game)/layout.tsx auth gate
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const admin = isAdmin(session);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <h1 className="text-3xl font-bold">User Profile</h1>
          {admin && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-semibold">
              Admin
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="text-gray-600 text-sm">Email</p>
            <p className="text-xl font-semibold">{session.user.email}</p>
          </div>

          <div className="border-b pb-4">
            <p className="text-gray-600 text-sm">User ID</p>
            <p className="text-xl font-mono">{session.user.id}</p>
          </div>

          <div className="mt-6">
            <a
              href="/player"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              Go to Player Hub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
