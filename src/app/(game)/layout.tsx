import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth.server";
import GameNav from "~/components/GameNav";
import { ToastProvider } from "~/components/Toast";
import { getBalance } from "../../../lib/currency";
import { getSubscriptionInfo } from "../../../lib/subscription";
import { getNewAchievementCount } from "~/data/getNewAchievementCount.server";
import { getActiveQuestCount } from "~/data/getActiveQuestCount.server";
import { getStreakCount } from "~/data/getStreakCount.server";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Single auth gate — all pages in this route group require authentication
  if (!session) {
    redirect("/login");
  }

  const [creditBalance, subInfo, newAchievementCount, activeQuestCount, currentStreak] = await Promise.all([
    getBalance(session.user.id),
    getSubscriptionInfo(session.user.id),
    getNewAchievementCount(session.user.id),
    getActiveQuestCount(session.user.id),
    getStreakCount(session.user.id),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <ToastProvider>
        <GameNav
          user={{ name: session.user.name, email: session.user.email }}
          creditBalance={creditBalance}
          isSubscriber={subInfo?.subscriptionStatus === "active"}
          newAchievementCount={newAchievementCount}
          activeQuestCount={activeQuestCount}
          currentStreak={currentStreak}
        />
        <main>{children}</main>
      </ToastProvider>
    </div>
  );
}
