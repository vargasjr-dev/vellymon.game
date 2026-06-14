import { auth } from "~/lib/auth.server";
import { isAdmin } from "~/lib/admin";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import ImpersonatePanel from "./ImpersonatePanel";
import { getSubscriptionInfo } from "../../../../lib/subscription";

export default async function AdminPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!isAdmin(session)) {
    notFound();
  }

  const subInfo = await getSubscriptionInfo(session!.user.id);
  const currentStatus = subInfo?.subscriptionStatus ?? "none";

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔧 Admin Panel</h1>
        <p className="text-gray-600 mt-1">
          Playtesting tools for admin users.
        </p>
      </div>

      {/* Matchmaking Lobby */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🎮 Matchmaking Lobby
        </h2>
        <p className="text-gray-600 mb-4">
          Monitor players currently waiting for an opponent.
        </p>
        <Link
          href="/admin/matchmaking"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          View Lobby →
        </Link>
      </div>

      {/* New Match */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">⚔️ New Match</h2>
        <p className="text-gray-600 mb-4">
          Pick two participants — AI profiles or random teams. Profile vs profile
          runs a full simulation and saves a spectatable replay. Mixed or
          random matches are live games you play.
        </p>
        <Link
          href="/admin/matches/new"
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
        >
          New Match →
        </Link>
      </div>

      {/* Impersonate free / pro */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🎭 Impersonate Subscription</h2>
        <p className="text-gray-600 mb-4">
          Toggle your own account between Free and Pro for testing. Writes directly
          to the DB — does not touch Stripe.
        </p>
        <ImpersonatePanel currentStatus={currentStatus} />
      </div>

      {/* AI Player Profiles */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🤖 AI Player Profiles</h2>
        <p className="text-gray-600 mb-4">
          Create named LLM-driven AI personas with fixed teams and a prompt that
          shapes their playstyle. Run profile matches from New Match above.
        </p>
        <Link
          href="/admin/profiles"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Manage Profiles →
        </Link>
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
