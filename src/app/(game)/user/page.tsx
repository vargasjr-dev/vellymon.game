import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";

export default async function UserPage() {
  const headersList = await headers();
  // Session guaranteed by (game)/layout.tsx auth gate
  const session = (await auth.api.getSession({ headers: headersList }))!;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">User Profile</h1>

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
              href="/market"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              Go to Market
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
