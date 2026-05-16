/**
 * Spectator page — watch a match live without being a player.
 *
 * No authentication required. Polls /api/spectate/[id] every 2s.
 * Works for:
 *  - Local CLI matches (reads .vellymon/[id].json from filesystem)
 *  - Web matches (TODO: add DB fallback in route.ts)
 */

import SpectateClient from "./SpectateClient";

export default async function SpectatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SpectateClient matchId={id} />;
}
