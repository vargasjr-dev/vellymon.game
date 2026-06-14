import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import Link from "next/link";
import { isAdmin } from "~/lib/admin";
import { getSubscriptionInfo } from "../../../../lib/subscription";
import SubscriptionCard from "~/components/SubscriptionCard";
import { db } from "../../../../data/db";
import { user as userTable } from "../../../../data/schema";
import { eq } from "drizzle-orm";
import UsernameForm from "./UsernameForm";
import EmailChangeForm from "./EmailChangeForm";
import PasswordChangeForm from "./PasswordChangeForm";

export default async function UserPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const admin = isAdmin(session);

  const [subInfo, userRow] = await Promise.all([
    getSubscriptionInfo(session.user.id),
    db
      .select({ username: userTable.username })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const currentUsername = userRow?.username ?? null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        {admin && (
          <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-semibold">
            Admin
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* Subscription tier */}
        <SubscriptionCard
          subscriptionStatus={subInfo?.subscriptionStatus ?? "none"}
          subscriptionStreakMonths={subInfo?.subscriptionStreakMonths ?? 0}
        />

        {/* Handle */}
        <UsernameForm currentUsername={currentUsername} />

        {/* Email */}
        <EmailChangeForm currentEmail={session.user.email} />

        {/* Password */}
        <PasswordChangeForm />

        {/* Back */}
        <Link
          href="/player"
          className="block text-center text-sm text-blue-600 hover:underline py-2"
        >
          ← Back to Player Hub
        </Link>
      </div>
    </div>
  );
}
