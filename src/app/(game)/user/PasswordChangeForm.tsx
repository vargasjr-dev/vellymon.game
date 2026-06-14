"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "./actions";

export default function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    if (next !== confirm) {
      setStatus("error");
      setMsg("New passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await changePasswordAction(current, next);
      if (result.success) {
        setStatus("success");
        setMsg("Password updated.");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setStatus("error");
        setMsg(result.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Change Password</h3>
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <input
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="New password (min 8 chars)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        {status === "error" && <p className="text-xs text-red-600">{msg}</p>}
        {status === "success" && <p className="text-xs text-green-600">✓ {msg}</p>}
        <button
          type="submit"
          disabled={isPending || !current || !next || !confirm}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition"
        >
          {isPending ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
