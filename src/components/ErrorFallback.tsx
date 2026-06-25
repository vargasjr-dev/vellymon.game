"use client";

/**
 * Reusable error fallback for Next.js error.tsx boundaries.
 * Shows a friendly message instead of crashing the whole app.
 */
export default function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6 text-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-4 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Refresh
        </button>
        <a
          href="/player"
          className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
