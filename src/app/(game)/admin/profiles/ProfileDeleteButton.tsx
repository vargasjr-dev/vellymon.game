"use client";

import { useTransition } from "react";
import { deleteProfileAction } from "./actions";

export default function ProfileDeleteButton({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete profile "${profileName}"? Match history links will be cleared.`)) return;
    startTransition(() => deleteProfileAction(profileId));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
