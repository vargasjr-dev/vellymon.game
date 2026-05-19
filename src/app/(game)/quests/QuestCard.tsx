"use client";

import { useState } from "react";
import type { QuestWithProgress } from "../../../../lib/questService";
import { claimQuestRewardAction } from "./actions";

type Props = {
  quest: QuestWithProgress;
};

export function QuestCard({ quest }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(quest.rewardClaimed);
  const [claimResult, setClaimResult] = useState<{
    xpAwarded: number;
    creditsAwarded: number;
  } | null>(null);

  const progressPct = Math.min(
    100,
    quest.target > 0 ? Math.round((quest.progress / quest.target) * 100) : 0,
  );

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await claimQuestRewardAction(quest.id);
      if (result.xpAwarded > 0 || result.creditsAwarded > 0) {
        setClaimResult(result);
        setClaimed(true);
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-5 transition ${
        claimed
          ? "bg-gray-50 border-gray-100"
          : quest.completed
            ? "bg-green-50 border-green-200 shadow-sm"
            : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      {/* Header row: icon + name/desc + reward badges */}
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{quest.icon}</span>
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm ${
              claimed ? "text-gray-400" : "text-gray-900"
            }`}
          >
            {quest.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{quest.description}</p>
        </div>
        <div className="flex flex-col gap-1 shrink-0 items-end">
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
            ⭐ +{quest.xpReward} XP
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
            💰 +{quest.creditsReward}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>
            {quest.progress} / {quest.target}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              quest.completed ? "bg-green-500" : "bg-blue-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Claim button — only when completed and not yet claimed */}
      {quest.completed && !claimed && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="mt-4 w-full py-2 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm"
        >
          {claiming ? "Claiming…" : "✓ Claim Reward"}
        </button>
      )}

      {/* Success feedback after claim */}
      {claimResult && (
        <p className="mt-3 text-center text-sm text-green-600 font-semibold">
          🎉 +{claimResult.xpAwarded} XP · +{claimResult.creditsAwarded} credits
        </p>
      )}

      {/* Already claimed state (from server — no animation) */}
      {claimed && !claimResult && (
        <p className="mt-3 text-xs text-gray-400 text-center font-medium">
          ✓ Reward claimed
        </p>
      )}
    </div>
  );
}
