import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import getMatch from "~/data/getMatch.server";
import getMatchSummary from "~/data/getMatchSummary.server";
import { isAdmin } from "~/lib/admin";
import WaitingRoom from "./WaitingRoom";
import MatchSummary from "./MatchSummary";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;
  const match = await getMatch(id);

  if (!match) {
    notFound();
  }

  // Completed matches get a richer post-game summary view
  if (match.status === "completed") {
    const summary = await getMatchSummary(id);
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {summary ? (
          <MatchSummary summary={summary} currentUserId={session.user.id} />
        ) : (
          <WaitingRoom
            initialMatch={match}
            currentUserId={session.user.id}
            isAdmin={isAdmin(session)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <WaitingRoom
        initialMatch={match}
        currentUserId={session.user.id}
        isAdmin={isAdmin(session)}
      />
    </div>
  );
}
