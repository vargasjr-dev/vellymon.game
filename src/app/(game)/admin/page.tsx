import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminMatchAction } from "./actions";

export default async function AdminPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!isAdmin(session)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔧 Admin Panel</h1>
        <p className="text-gray-600 mt-1">
          Playtesting tools for admin users.
        </p>
      </div>

      {/* Admin Match Mode */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ⚔️ Admin Match
        </h2>
        <p className="text-gray-600 mb-4">
          Auto-generates two random teams from all 64 vellymons (8 per
          team, 4 active + 4 bench). You play as both sides — perfect for
          testing special powers and balance.
        </p>
        <ul className="text-sm text-gray-500 mb-6 space-y-1">
          <li>• 16 random vellymons drawn from the full library</li>
          <li>• No market purchases required — instances created on the fly</li>
          <li>• Both teams assigned to your account</li>
          <li>• Match starts in &quot;waiting&quot; status, ready to play</li>
        </ul>
        <form action={createAdminMatchAction}>
          <button
            type="submit"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition w-full"
          >
            🎲 Create Admin Match
          </button>
        </form>
      </div>
    </div>
  );
}
