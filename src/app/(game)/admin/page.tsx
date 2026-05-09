import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminMatchForm from "./AdminMatchForm";

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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ⚔️ Admin Match
        </h2>
        <p className="text-gray-600 mb-4">
          Auto-generates two random teams from all 64 vellymons (8 per
          team, 4 active + 4 bench). You play as both sides — perfect for
          testing special powers and balance.
        </p>

        <AdminMatchForm />
      </div>

      {/* Stripe Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          💳 Stripe Configuration
        </h2>
        <p className="text-gray-600 mb-4">
          Manage the Vellymon Premium subscription product and verify Stripe
          integration.
        </p>
        <Link
          href="/admin/stripe"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Open Stripe Setup →
        </Link>
      </div>
    </div>
  );
}
