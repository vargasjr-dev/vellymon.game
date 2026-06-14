"use client";

import { useState } from "react";
import type { LoginStreakRow, StreakMilestone } from "../../../../lib/loginStreak";
import {
  BASE_DAILY_XP,
  BASE_DAILY_CREDITS,
  STREAK_MILESTONES,
  getNextMilestone,
  todayUTCDate,
} from "../../../../lib/loginStreak";
import { claimDailyCheckInAction } from "./actions";

type Props = {
  initialStreak: LoginStreakRow;
  isSubscriber?: boolean;
};

export function DailyCheckIn({ initialStreak, isSubscriber = false }: Props) {
  const alreadyClaimedToday = initialStreak.lastClaimedDate === todayUTCDate();

  const [streak, setStreak] = useState(initialStreak.currentStreak);
  const [freezeCount, setFreezeCount] = useState(initialStreak.streakFreezeCount);
  const [claimed, setClaimed] = useState(alreadyClaimedToday);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{
    xpAwarded: number;
    creditsAwarded: number;
    milestoneHit?: StreakMilestone;
    usedFreeze?: boolean;
  } | null>(null);

  const nextMilestone = getNextMilestone(streak);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await claimDailyCheckInAction();
      if (!res.alreadyClaimed) {
        setStreak(res.newStreak);
        if (res.freezeCount !== undefined) setFreezeCount(res.freezeCount);
        setClaimed(true);
        setResult({
          xpAwarded: res.xpAwarded,
          creditsAwarded: res.creditsAwarded,
          milestoneHit: res.milestoneHit,
          usedFreeze: res.usedFreeze,
        });
      } else {
        setClaimed(true);
      }
    } finally {
      setClaiming(false);
    }
  };

  // Progress toward next milestone
  const prevMilestone = STREAK_MILESTONES.slice()
    .reverse()
    .find((m) => m.days <= streak);
  const prevDays = prevMilestone?.days ?? 0;
  const nextDays = nextMilestone?.days ?? streak;
  const milestoneProgress =
    nextMilestone && nextDays > prevDays
      ? Math.round(((streak - prevDays) / (nextDays - prevDays)) * 100)
      : 100;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">
              Daily Check-In
            </h3>
            <p className="text-sm text-orange-600 font-medium">
              {streak > 0
                ? `${streak}-day streak${streak >= 7 ? " 🔥" : ""}`
                : "Start your streak today!"}
            </p>
          </div>
        </div>

        {/* Streak number */}
        {streak > 0 && (
          <div className="flex flex-col items-center bg-orange-100 border border-orange-200 rounded-xl px-4 py-2">
            <span className="text-2xl font-black text-orange-500">{streak}</span>
            <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide">
              days
            </span>
          </div>
        )}
      </div>

      {/* Milestone progress bar */}
      {nextMilestone && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Next milestone: {nextMilestone.icon} {nextMilestone.label} (Day {nextMilestone.days})</span>
            <span>{streak}/{nextMilestone.days}</span>
          </div>
          <div className="h-2 bg-orange-100 rounded-full overflow-hidden border border-orange-200">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Milestone bonus: +{nextMilestone.xpBonus} XP, +{nextMilestone.creditsBonus} 💰 credits
          </p>
        </div>
      )}

      {/* Claim result banner */}
      {result && (
        <div className={`mb-4 rounded-lg px-4 py-3 flex items-center gap-3 ${
          result.usedFreeze
            ? "bg-blue-50 border border-blue-200"
            : "bg-green-50 border border-green-200"
        }`}>
          <span className="text-xl">{result.usedFreeze ? "🧊" : "✅"}</span>
          <div className="flex-1">
            {result.usedFreeze ? (
              <p className="text-sm font-bold text-blue-700">
                Streak freeze used! Your streak is safe. ❄️
              </p>
            ) : result.milestoneHit ? (
              <p className="text-sm font-bold text-green-700">
                {result.milestoneHit.icon} {result.milestoneHit.label} reached!
              </p>
            ) : (
              <p className="text-sm font-semibold text-green-700">Check-in claimed!</p>
            )}
            <p className={`text-xs ${result.usedFreeze ? "text-blue-600" : "text-green-600"}`}>
              +{result.xpAwarded} XP &nbsp;·&nbsp; +{result.creditsAwarded} 💰 credits
            </p>
          </div>
        </div>
      )}

      {/* Subscriber freeze count */}
      {isSubscriber && (
        <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 font-medium">
          <span>🧊</span>
          <span>
            {freezeCount > 0
              ? `${freezeCount} streak freeze${freezeCount === 1 ? "" : "s"} available`
              : "No streak freezes — earned weekly as a subscriber"}
          </span>
        </div>
      )}

      {/* CTA row */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Today&apos;s reward:</span>{" "}
          +{BASE_DAILY_XP} XP &amp; +{BASE_DAILY_CREDITS} 💰 credits
        </div>

        {claimed ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-200 rounded-lg text-sm font-semibold text-green-700">
            <span>✅</span>
            <span>Come back tomorrow!</span>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg text-sm shadow-sm transition-all"
          >
            {claiming ? "Claiming…" : "🔥 Claim Check-In"}
          </button>
        )}
      </div>
    </div>
  );
}
