"use client";

import { useState } from "react";
import { purchaseVellymon } from "./actions";

interface BuyButtonProps {
  modelUuid: string;
}

export default function BuyButton({ modelUuid }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await purchaseVellymon(modelUuid);
      setResult(res);
    } catch {
      setResult({ success: false, message: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Buying…" : "Buy Now"}
      </button>
      {result && (
        <p
          className={`mt-2 text-sm text-center ${
            result.success ? "text-green-600" : "text-red-600"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
