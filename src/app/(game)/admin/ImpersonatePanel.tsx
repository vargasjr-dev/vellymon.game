"use client";

import { useState } from "react";
import { impersonateSubscriptionAction } from "./actions";

export default function ImpersonatePanel({
  currentStatus,
}: {
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState<"free" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSet = async (tier: "free" | "pro") => {
    setLoading(tier);
    setError(null);
    try {
      await impersonateSubscriptionAction(tier);
      setStatus(tier === "pro" ? "active" : "none");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  };

  const isFree = status === "none" || status === "canceled";
  const isPro = status === "active";

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Current status:</span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isPro
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {isPro ? "⭐ Pro" : "🆓 Free"}
        </span>
        {status !== "none" && status !== "active" && (
          <span className="text-xs text-gray-400">({status})</span>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleSet("free")}
          disabled={loading !== null || isFree}
          className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading === "free" ? "Setting…" : "Set Free"}
        </button>
        <button
          onClick={() => handleSet("pro")}
          disabled={loading !== null || isPro}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading === "pro" ? "Setting…" : "⭐ Set Pro"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <p className="mt-3 text-xs text-gray-400">
        Directly sets your account's subscription status in the DB for testing.
        Does not touch Stripe. Refresh the page after switching to see the full effect.
      </p>
    </div>
  );
}
