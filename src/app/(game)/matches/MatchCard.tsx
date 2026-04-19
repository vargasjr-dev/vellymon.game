import Link from "next/link";

type Match = {
  uuid: string;
  status: string;
  createdAt: Date;
  createdBy: string;
  creatorName: string | null;
  currentPlayers: number;
};

type MatchCardProps = {
  match: Match;
  currentUserId: string;
  variant: "active" | "joinable" | "history";
};

const statusLabels: Record<string, { label: string; color: string }> = {
  waiting: { label: "Waiting", color: "bg-yellow-100 text-yellow-700" },
  ready: { label: "Ready", color: "bg-green-100 text-green-700" },
  playing: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function MatchCard({
  match,
  currentUserId,
  variant,
}: MatchCardProps) {
  const isCreator = match.createdBy === currentUserId;
  const status = statusLabels[match.status] ?? {
    label: match.status,
    color: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>
          {isCreator && (
            <span className="text-xs text-gray-400 font-medium">
              Your match
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">
          {isCreator
            ? "You"
            : match.creatorName ?? "Unknown"}{" "}
          <span className="text-gray-400 font-normal">created</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatTimeAgo(new Date(match.createdAt))} ·{" "}
          {match.currentPlayers}/2 players
        </p>
      </div>

      <div className="ml-4">
        {variant === "joinable" && (
          <Link
            href={`/matches/${match.uuid}/join`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            Join
          </Link>
        )}
        {variant === "active" && match.status === "waiting" && isCreator && (
          <Link
            href={`/matches/${match.uuid}`}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition"
          >
            Waiting…
          </Link>
        )}
        {variant === "active" && match.status === "playing" && (
          <Link
            href={`/matches/${match.uuid}/play`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Play
          </Link>
        )}
        {variant === "active" && match.status === "ready" && (
          <Link
            href={`/matches/${match.uuid}`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            Ready!
          </Link>
        )}
        {variant === "history" && (
          <Link
            href={`/matches/${match.uuid}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View →
          </Link>
        )}
      </div>
    </div>
  );
}
