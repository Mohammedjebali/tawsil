"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function TestSentryButton() {
  const [status, setStatus] = useState<string>("");

  async function triggerClientError() {
    try {
      throw new Error("Sentry client-side test error — if you see this in Sentry, it works!");
    } catch (error) {
      Sentry.captureException(error);
      setStatus("Client error sent!");
    }
  }

  async function triggerServerError() {
    setStatus("Sending...");
    const res = await fetch("/api/test-sentry");
    if (res.ok) {
      setStatus("Server error sent!");
    } else {
      setStatus(`Server test failed: ${res.status}`);
    }
  }

  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  return (
    <div style={{ padding: "16px", margin: "16px 0", border: "1px dashed #e2e8f0", borderRadius: 8, textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Sentry Debug</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          onClick={triggerClientError}
          style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer",
          }}
        >
          Test Client Error
        </button>
        <button
          onClick={triggerServerError}
          style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#fef3c7", color: "#d97706", border: "none", cursor: "pointer",
          }}
        >
          Test Server Error
        </button>
      </div>
      {status && <p style={{ fontSize: 12, color: "#6366f1", marginTop: 8 }}>{status}</p>}
    </div>
  );
}
