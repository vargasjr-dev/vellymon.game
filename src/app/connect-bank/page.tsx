"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Plaid: any;
  }
}

export default function ConnectBankPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  async function handleConnect() {
    setStatus("loading");
    setMessage("Creating link token...");

    try {
      const tokenRes = await fetch("/api/plaid/link-token", { method: "POST" });
      const tokenData = await tokenRes.json();

      if (!tokenData.link_token) {
        setStatus("error");
        setMessage("Failed to create link token: " + JSON.stringify(tokenData));
        return;
      }

      const handler = window.Plaid.create({
        token: tokenData.link_token,
        onSuccess: async (publicToken: string) => {
          setMessage("Exchanging token...");
          const exchRes = await fetch("/api/plaid/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token: publicToken }),
          });
          const exchData = await exchRes.json();
          if (exchData.success) {
            setStatus("success");
            setMessage("✅ Capital One connected! You can close this tab.");
          } else {
            setStatus("error");
            setMessage("Exchange failed: " + JSON.stringify(exchData));
          }
        },
        onExit: (err: { display_message?: string } | null) => {
          if (err) {
            setStatus("error");
            setMessage(err.display_message ?? "Link exited with error");
          } else {
            setStatus("idle");
            setMessage("");
          }
        },
      });

      handler.open();
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <h1 style={{ color: "#3ba4dc", fontSize: 28, marginBottom: 8 }}>⚔️ VargasJR</h1>
        <p style={{ color: "#999", marginBottom: 32 }}>Connect your Capital One account</p>

        {status !== "success" && (
          <button
            onClick={handleConnect}
            disabled={status === "loading"}
            style={{
              background: status === "loading" ? "#555" : "#3ba4dc",
              color: "#fff",
              border: "none",
              padding: "16px 32px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: status === "loading" ? "wait" : "pointer",
            }}
          >
            {status === "loading" ? "Connecting..." : "Connect Capital One"}
          </button>
        )}

        {message && (
          <p
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 8,
              background: status === "success" ? "#1a3a2a" : status === "error" ? "#3a1a1a" : "#1a2a3a",
              color: status === "success" ? "#4ade80" : status === "error" ? "#f87171" : "#3ba4dc",
              border: `1px solid ${status === "success" ? "#22543d" : status === "error" ? "#7f1d1d" : "#1e3a5f"}`,
              fontSize: 14,
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
