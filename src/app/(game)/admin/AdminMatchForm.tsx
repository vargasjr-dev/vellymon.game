"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MatchSettingsPanel from "~/components/MatchSettingsPanel";
import {
  DEFAULT_MATCH_SETTINGS,
  type MatchSettings,
} from "~/lib/matchSettings";
import { createAdminMatchAction } from "./actions";

export default function AdminMatchForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_MATCH_SETTINGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await createAdminMatchAction(settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create match");
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <MatchSettingsPanel settings={settings} onChange={setSettings} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      <button
        onClick={handleCreate}
        disabled={creating}
        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? "Creating..." : "🎲 Create Admin Match"}
      </button>
    </div>
  );
}
