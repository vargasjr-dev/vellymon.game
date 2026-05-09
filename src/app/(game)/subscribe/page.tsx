import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth.server";
import { db } from "../../../../data/db";
import { user } from "../../../../data/schema";
import { eq } from "drizzle-orm";
import SubscribeButton from "./SubscribeButton";

export default async function SubscribePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if already subscribed
  const [existing] = await db
    .select({ subscriptionStatus: user.subscriptionStatus })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (existing?.subscriptionStatus === "active") {
    redirect("/player");
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vellymon Premium
        </h1>
        <p className="text-gray-600 mb-6">
          Unlock the full Vellymon experience.
        </p>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 mb-6 text-left">
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>
                <strong>AI Cosmetic Builder</strong> — Design your own skins and
                effects
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>
                <strong>Monthly Credits</strong> — 500 credits/month (loyalty
                bonus up to 1000)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>
                <strong>Season Pass</strong> — Exclusive rewards track each
                season
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>
                <strong>New Vellymon Early Access</strong> — Day-1 unlock each
                season
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              <span>
                <strong>Ranked Play</strong> — Compete on the ladder
              </span>
            </li>
          </ul>
        </div>

        <SubscribeButton />

        <p className="mt-4 text-xs text-gray-400">
          Cancel anytime. Your cosmetics go dormant — never deleted.
        </p>
      </div>
    </div>
  );
}
