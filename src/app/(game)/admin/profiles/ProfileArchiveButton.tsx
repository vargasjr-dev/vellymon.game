"use client";

import { useTransition } from "react";
import { archiveProfileAction } from "./actions";

export default function ProfileArchiveButton({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    if (!confirm(`Archive profile "${profileName}"? It will be hidden from all views but match history will be retained.`)) return;
    startTransition(() => archiveProfileAction(profileId));
  }

  return (
    <button
      onClick={handleArchive}
      disabled={pending}
      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
    >
      {pending ? "Archiving…" : "Archive"}
    </button>
  );
}
