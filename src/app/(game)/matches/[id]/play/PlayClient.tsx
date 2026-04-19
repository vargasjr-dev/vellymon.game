"use client";

import Link from "next/link";
import {
  useGameSocket,
  type CommandPayload,
  type GameStatePayload,
} from "~/hooks/useGameSocket";

type PlayClientProps = {
  matchUuid: string;
  userId: string;
  playerTeamName: string;
};

export default function PlayClient({
  matchUuid,
  userId,
  playerTeamName,
}: PlayClientProps) {
  // TODO: auth token will come from session — placeholder for now
  const {
    connectionState,
    teamId,
    gameState,
    turnResults,
    timerSeconds,
    opponentReady,
    commandsAccepted,
    gameOver,
    error,
    sendCommands,
  } = useGameSocket(matchUuid, userId);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/matches/${matchUuid}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Match Details
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionIndicator state={connectionState} />
          {teamId && (
            <span className="text-xs font-medium text-gray-500">
              {playerTeamName} (P{teamId})
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center mb-6">
          <p className="text-5xl mb-4">
            {gameOver.winner === teamId ? "🏆" : "💀"}
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {gameOver.winner === teamId ? "Victory!" : "Defeat"}
          </h2>
          <p className="text-gray-600 mb-1">
            Won by{" "}
            <span className="font-semibold capitalize">
              {gameOver.condition}
            </span>
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {gameOver.winner === teamId
              ? "Your strategy prevailed."
              : "Better luck next time."}
          </p>
          <Link
            href="/matches"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Back to Matches
          </Link>
        </div>
      )}

      {/* Connecting State */}
      {connectionState === "connecting" && !gameOver && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Connecting to Game Server...
          </h2>
          <p className="text-gray-600">
            Establishing connection for match {matchUuid.slice(0, 8)}.
          </p>
        </div>
      )}

      {/* Active Game */}
      {connectionState === "connected" && gameState && !gameOver && (
        <div className="space-y-4">
          {/* HUD Bar */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              {/* Your Team */}
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Your Team</p>
                <p className="text-lg font-bold text-blue-600">
                  {gameState.yourTeam.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">⚡</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (gameState.yourTeam.energy / 120) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-700">
                    {gameState.yourTeam.energy}
                  </span>
                </div>
              </div>

              {/* Turn / Timer */}
              <div className="text-center px-6">
                <p className="text-xs text-gray-500">Turn {gameState.turn}</p>
                <p
                  className={`text-3xl font-bold font-mono ${
                    timerSeconds <= 5
                      ? "text-red-600 animate-pulse"
                      : timerSeconds <= 10
                        ? "text-yellow-600"
                        : "text-gray-900"
                  }`}
                >
                  {timerSeconds}s
                </p>
                {commandsAccepted && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ✓ Submitted
                  </p>
                )}
                {opponentReady && !commandsAccepted && (
                  <p className="text-xs text-yellow-600 font-medium mt-1">
                    Opponent ready
                  </p>
                )}
              </div>

              {/* Opponent Team */}
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-500 mb-1">Opponent</p>
                <p className="text-lg font-bold text-red-600">
                  {gameState.opponentTeam.name}
                </p>
                <div className="flex items-center gap-2 mt-1 justify-end">
                  <span className="text-xs font-mono text-gray-700">
                    {gameState.opponentTeam.energy}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                    <div
                      className="bg-red-400 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (gameState.opponentTeam.energy / 120) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">⚡</span>
                </div>
              </div>
            </div>
          </div>

          {/* Board Placeholder */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-4xl mb-3">🗺️</p>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Board Renderer
              </h3>
              <p className="text-sm text-gray-600">
                Phase 7 — {gameState.board.width}×{gameState.board.height} grid
                with {gameState.yourTeam.active.length} active vellymons.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Command input and board visualization coming in the Match UI
                phase.
              </p>
            </div>
          </div>

          {/* Team Roster Summary */}
          <div className="grid grid-cols-2 gap-4">
            {/* Your Active */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Your Active ({gameState.yourTeam.active.filter((v) => !v.isKO).length}/
                {gameState.yourTeam.active.length})
              </h3>
              <div className="space-y-2">
                {gameState.yourTeam.active.map((v) => (
                  <div
                    key={v.uuid}
                    className={`flex items-center justify-between text-xs p-2 rounded ${
                      v.isKO
                        ? "bg-gray-100 text-gray-400 line-through"
                        : "bg-blue-50 text-gray-900"
                    }`}
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="font-mono">
                      {v.hp}/{v.maxHp} HP
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Bench: {gameState.yourTeam.benchCount} · KO&apos;d:{" "}
                {gameState.yourTeam.knockedCount}
              </p>
            </div>

            {/* Opponent Active */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Opponent Active (
                {gameState.opponentTeam.active.filter((v) => !v.isKO).length}/
                {gameState.opponentTeam.active.length})
              </h3>
              <div className="space-y-2">
                {gameState.opponentTeam.active.map((v) => (
                  <div
                    key={v.uuid}
                    className={`flex items-center justify-between text-xs p-2 rounded ${
                      v.isKO
                        ? "bg-gray-100 text-gray-400 line-through"
                        : "bg-red-50 text-gray-900"
                    }`}
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="font-mono">
                      {v.hp}/{v.maxHp} HP
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Bench: {gameState.opponentTeam.benchCount} · KO&apos;d:{" "}
                {gameState.opponentTeam.knockedCount}
              </p>
            </div>
          </div>

          {/* Turn Results */}
          {turnResults && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Turn {turnResults.turn} Results
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {turnResults.events.map((event, i) => (
                  <p key={i} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-800">
                      {event.vellymonName ?? "System"}
                    </span>{" "}
                    — {event.detail}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnected */}
      {connectionState === "disconnected" && !gameOver && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-5xl mb-4">📡</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Disconnected
          </h2>
          <p className="text-gray-600 mb-6">
            Connection to game server lost. Refresh to reconnect.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Reconnect
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ConnectionIndicator({ state }: { state: string }) {
  const config: Record<string, { color: string; label: string }> = {
    connecting: { color: "bg-yellow-500 animate-pulse", label: "Connecting" },
    connected: { color: "bg-green-500", label: "Connected" },
    disconnected: { color: "bg-red-500", label: "Disconnected" },
    error: { color: "bg-red-500", label: "Error" },
  };

  const c = config[state] ?? config.error;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${c.color}`} />
      <span className="text-xs text-gray-500">{c.label}</span>
    </div>
  );
}
