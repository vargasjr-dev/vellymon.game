import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import getMatch from "~/data/getMatch.server";
import PlayClient from "./PlayClient";

export default async function PlayPage({
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

  // Must be a player in this match
  const player = match.players.find((p) => p.userId === session.user.id);
  if (!player) {
    redirect(`/matches/${id}`);
  }

  // Match must be in a playable state
  if (match.status !== "playing" && match.status !== "ready") {
    redirect(`/matches/${id}`);
  }

  return (
    <PlayClient
      matchUuid={match.uuid}
      userId={session.user.id}
      playerTeamName={player.teamName ?? "Your Team"}
    />
  );
}
