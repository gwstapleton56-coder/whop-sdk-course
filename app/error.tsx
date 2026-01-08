"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        Something went wrong
      </h2>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Try reloading. If it keeps happening, contact support.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}



