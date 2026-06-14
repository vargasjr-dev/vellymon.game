"use client";

import { useState, useTransition } from "react";
import { changeEmailAction } from "./actions";

export default function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await changeEmailAction(value.trim());
      if (result.success) {
        setStatus("success");
        setMsg("Verification email sent. Click the link in it to confirm your new address.");
        setValue("");
      } else {
        setStatus("error");
        setMsg(result.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Change Email</h3>
      <p className="text-xs text-gray-400 mb-3">Current: {currentEmail}</p>
      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            type="email"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            placeholder="New email address"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          {status === "error" && <p className="text-xs text-red-600 mt-1">{msg}</p>}
          {status === "success" && <p className="text-xs text-green-600 mt-1">✓ {msg}</p>}
        </div>
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition whitespace-nowrap"
        >
          {isPending ? "Sending…" : "Send Verification"}
        </button>
      </form>
    </div>
  );
}
