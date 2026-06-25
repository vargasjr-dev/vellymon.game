"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProfileSparringMatchAction } from "./actions";
import { MAP_OPTIONS } from "~/lib/matchSettings";
import VellymonPremiumLogo from "~/components/VellymonPremiumLogo";

type TeamOption = { uuid: string; name: string };
type ProfileOption = { id: string; name: string; description: string };

interface PracticeSetupProps {
  teams: TeamOption[];
  subscribed: boolean;
  profiles: ProfileOption[];
}

// ── Paywall ───────────────────────────────────────────────────────────────────
function PremiumGate() {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-5">
        <VellymonPremiumLogo />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Premium Required</h2>
      <p className="text-gray-600 mb-4">
        Practice Mode is a Premium feature — subscribe to battle custom
        opponent profiles and sharpen your strategy.
      </p>
      <a
        href="/subscribe"
        className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg"
      >
        Subscribe — $8/month
      </a>
    </div>
  );
}

// ── No teams ──────────────────────────────────────────────────────────────────
function NoTeamsGate() {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">🏗️</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">No Teams Yet</h2>
      <p className="text-gray-600 mb-4">
        Build a team first, then come back for sparring practice.
      </p>
      <a
        href="/roster"
        className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg"
      >
        Build a Team
      </a>
    </div>
  );
}

// ── No profiles ───────────────────────────────────────────────────────────────
function NoProfilesGate() {
  return (
    <div className="text-center py-10 text-gray-500">
      <p className="text-4xl mb-3">🥊</p>
      <p className="font-medium text-gray-700">No opponent profiles yet</p>
      <p className="text-sm mt-1">
        AI profiles are coming soon — check back shortly.
      </p>
    </div>
  );
}

// ── Play tab ──────────────────────────────────────────────────────────────────
function PlayTab({
  teams,
  profiles,
}: {
  teams: TeamOption[];
  profiles: ProfileOption[];
}) {
  const router = useRouter();
  const [teamUuid, setTeamUuid] = useState(teams[0]?.uuid ?? "");
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [mapId, setMapId] = useState("standard");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!teamUuid || !profileId) return;
    setCreating(true);
    setError(null);

    const result = await createProfileSparringMatchAction(teamUuid, profileId, mapId);

    if (result.success) {
      router.push(`/matches/${result.matchUuid}/play`);
    } else {
      setError(result.error);
      setCreating(false);
    }
  }

  if (profiles.length === 0) return <NoProfilesGate />;

  return (
    <div className="space-y-6">
      {/* Your Team */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Team
        </label>
        <select
          value={teamUuid}
          onChange={(e) => setTeamUuid(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {teams.map((t) => (
            <option key={t.uuid} value={t.uuid}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Opponent profile */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opponent
        </label>
        <div className="space-y-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfileId(p.id)}
              className={`w-full text-left p-3 rounded-xl border-2 transition ${
                profileId === p.id
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="font-semibold text-sm text-gray-900">{p.name}</span>
              {p.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {p.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Map</label>
        <div className="grid grid-cols-2 gap-3">
          {MAP_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMapId(m.id)}
              className={`p-3 rounded-lg border-2 text-left transition ${
                mapId === m.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="font-medium text-sm text-gray-900">{m.name}</span>
              <span className="text-xs text-gray-400 ml-2">{m.dimensions}</span>
              <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleStart}
        disabled={creating || !teamUuid || !profileId}
        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all"
      >
        {creating ? "Setting up match…" : "🥊 Start Practice"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Practice Mode has no ranked impact. Train freely!
      </p>
    </div>
  );
}

// ── Watch tab ─────────────────────────────────────────────────────────────────
type SimResult = {
  matchId: string;
  spectateUrl: string;
  winner: string | null;
  turns: number;
  simulationMs: number;
  remaining: number;
  limit: number;
};

function WatchTab({ profiles }: { profiles: ProfileOption[] }) {
  const [p1Id, setP1Id] = useState(profiles[0]?.id ?? "");
  const [p2Id, setP2Id] = useState(profiles[1]?.id ?? profiles[0]?.id ?? "");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate() {
    if (!p1Id || !p2Id) return;
    setSimulating(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/practice/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p1ProfileId: p1Id, p2ProfileId: p2Id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Simulation failed");
      } else {
        setResult(data as SimResult);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSimulating(false);
    }
  }

  if (profiles.length < 2) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-4xl mb-3">🥊</p>
        <p className="font-medium text-gray-700">Not enough profiles yet</p>
        <p className="text-sm mt-1">
          At least 2 AI profiles are needed for a Watch simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Pick two AI profiles — we&apos;ll run a full match server-side and give
        you a spectate link. Up to{" "}
        <span className="font-semibold text-gray-700">10 simulations / day</span>.
      </p>

      {/* Profile pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Profile 1
          </label>
          <div className="space-y-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setP1Id(p.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition ${
                  p1Id === p.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="font-semibold text-sm text-gray-900 block">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Profile 2
          </label>
          <div className="space-y-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setP2Id(p.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition ${
                  p2Id === p.id
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="font-semibold text-sm text-gray-900 block">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-emerald-700 mb-1">
            ✅ Simulation complete — {result.turns} turns
          </p>
          <p className="text-sm text-gray-600 mb-3">
            {result.winner ? (
              <>
                <span className="font-bold text-gray-900">{result.winner}</span>{" "}
                wins!
              </>
            ) : (
              "Draw — both teams held on!"
            )}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href={result.spectateUrl}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition"
            >
              👁 Watch Replay →
            </Link>
            <span className="text-xs text-gray-400">
              {result.remaining} simulation{result.remaining !== 1 ? "s" : ""} remaining today
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleSimulate}
        disabled={simulating || !p1Id || !p2Id}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
      >
        {simulating ? "⏳ Simulating…" : "▶️ Simulate Match"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Simulations run in the background. Results are spectatable replays.
      </p>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PracticeSetup({ teams, subscribed, profiles }: PracticeSetupProps) {
  const [tab, setTab] = useState<"play" | "watch">("play");

  if (!subscribed) return <PremiumGate />;
  if (tab === "play" && teams.length === 0) return <NoTeamsGate />;

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab("play")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
            tab === "play"
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🥊 Play
        </button>
        <button
          onClick={() => setTab("watch")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
            tab === "watch"
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          👁 Watch
        </button>
      </div>

      {tab === "play" ? (
        <PlayTab teams={teams} profiles={profiles} />
      ) : (
        <WatchTab profiles={profiles} />
      )}
    </div>
  );
}
