"use client";

import { useState, useTransition } from "react";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export default function ApiKeyManager({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [newName, setNewName] = useState("");
  const [revealedKey, setRevealedKey] = useState<{ id: string; raw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createApiKeyAction(newName);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRevealedKey({ id: result.id, raw: result.rawKey });
      setNewName("");
      // Add optimistic row
      setKeys((prev) => [
        ...prev,
        {
          id: result.id,
          name: newName.trim(),
          keyPrefix: result.rawKey.slice(0, 12),
          createdAt: new Date(),
          lastUsedAt: null,
          revokedAt: null,
        },
      ]);
    });
  };

  const handleRevoke = (id: string) => {
    setRevokingId(id);
    startTransition(async () => {
      const result = await revokeApiKeyAction(id);
      if (!result.success) {
        setError(result.error ?? "Revoke failed");
      } else {
        setKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date() } : k)),
        );
      }
      setRevokingId(null);
    });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      {/* New key revealed — show once */}
      {revealedKey && (
        <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800 mb-2">
            ✅ Key created — copy it now. You will never see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-white border border-green-200 rounded px-3 py-2 break-all text-gray-900">
              {revealedKey.raw}
            </code>
            <button
              onClick={() => handleCopy(revealedKey.raw)}
              className="shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-2 text-xs text-green-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder='e.g. "VargasJR"'
            maxLength={64}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-md transition"
          >
            {isPending ? "Creating…" : "Create Key"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>

      {/* Active keys */}
      {activeKeys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Active ({activeKeys.length})
          </h3>
          <div className="space-y-2">
            {activeKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{k.keyPrefix}…</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt
                      ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : " · Never used"}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  disabled={isPending && revokingId === k.id}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 rounded transition"
                >
                  {revokingId === k.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Revoked ({revokedKeys.length})
          </h3>
          <div className="space-y-2">
            {revokedKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 opacity-60"
              >
                <div>
                  <p className="font-semibold text-gray-600 text-sm line-through">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{k.keyPrefix}…</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Revoked {new Date(k.revokedAt!).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-semibold">REVOKED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeKeys.length === 0 && revokedKeys.length === 0 && (
        <p className="text-sm text-gray-500 italic">No API keys yet.</p>
      )}
    </div>
  );
}
