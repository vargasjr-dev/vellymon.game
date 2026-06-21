import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { isSubscriber } from "../../../../lib/subscription";
import { db } from "../../../../data/db";
import { team } from "../../../../data/schema";
import { eq } from "drizzle-orm";
import PracticeSetup from "./PracticeSetup";

export default async function PracticePage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [subscribed, teams] = await Promise.all([
    isSubscriber(session.user.id),
    db
      .select({ uuid: team.uuid, name: team.name })
      .from(team)
      .where(eq(team.userId, session.user.id)),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🥊 Practice Mode</h1>
        <p className="text-gray-600 mt-1">
          Hone your strategy against automated opponent profiles — or pit
          profiles against each other. No ranked impact.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <PracticeSetup teams={teams} subscribed={subscribed} />
      </div>
    </div>
  );
}
