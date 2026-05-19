"use client";

import { useState, useTransition } from "react";
import { setUsernameAction } from "./actions";

export default function UsernameForm({
  currentUsername,
}: {
  currentUsername: string | null;
}) {
  const [value, setValue] = useState(currentUsername ?? "");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMsg("");

    startTransition(async () => {
      const result = await setUsernameAction(value.trim());
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Username</h3>
      <p className="text-sm text-gray-500 mb-4">
        Set a unique handle for your public profile URL (3–20 chars,
        letters/numbers/underscores only).
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <div className="flex-1">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
            <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm select-none border-r border-gray-300">
              @
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setStatus("idle");
              }}
              placeholder="your_handle"
              maxLength={20}
              pattern="[a-zA-Z0-9_]{3,20}"
              className="flex-1 px-3 py-2 text-sm outline-none bg-white"
            />
          </div>
          {status === "error" && (
            <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
          )}
          {status === "success" && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Username saved! Profile at /profile/@{value}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || value.trim() === (currentUsername ?? "")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
