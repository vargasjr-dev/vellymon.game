import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import getMatch from "~/data/getMatch.server";
import WaitingRoom from "./WaitingRoom";

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <WaitingRoom initialMatch={match} currentUserId={session.user.id} />
    </div>
  );
}
