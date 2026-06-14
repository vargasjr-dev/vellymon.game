"use client";

import { useState, useTransition } from "react";
import { archiveProfileAction } from "./actions";
import ConfirmDialog from "~/components/ConfirmDialog";

export default function ProfileArchiveButton({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={pending}
        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
      >
        {pending ? "Archiving…" : "Archive"}
      </button>
      <ConfirmDialog
        open={showConfirm}
        title={`Archive "${profileName}"?`}
        message="It will be hidden from all views but match history will be retained."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          setShowConfirm(false);
          startTransition(() => archiveProfileAction(profileId));
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
