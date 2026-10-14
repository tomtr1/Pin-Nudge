"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, background: "#f7f7f4", color: "#1f2421" }}>
        <h1>Something went wrong</h1>
        <p>Please try again. Your saved work is not affected.</p>
        <button type="button" onClick={reset} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cfd0c8" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
