import Link from "next/link";

interface VellymonCardProps {
  name: string;
  health: number;
  attack: number;
  speed: number;
  energy: number;
  uuid?: string;
  href?: string;
  variant?: "full" | "compact";
  flavor?: string;
  children?: React.ReactNode;
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-400 uppercase">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}

function CompactContent({
  name,
  health,
  attack,
  speed,
  flavor,
  children,
}: {
  name: string;
  health: number;
  attack: number;
  speed: number;
  flavor?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition truncate">
          {name}
        </h3>
      </div>
      {flavor && (
        <p className="text-[11px] text-gray-400 mb-2 line-clamp-2 leading-tight">
          {flavor}
        </p>
      )}
      <div className="flex justify-between px-1">
        <StatBadge label="HP" value={health} />
        <StatBadge label="ATK" value={attack} />
        <StatBadge label="SPD" value={speed} />
      </div>
      {children}
    </>
  );
}

export default function VellymonCard({
  name,
  health,
  attack,
  speed,
  href,
  variant = "full",
  flavor,
  children,
}: VellymonCardProps) {
  if (variant === "compact") {
    const content = (
      <CompactContent
        name={name}
        health={health}
        attack={attack}
        speed={speed}
        flavor={flavor}
      >
        {children}
      </CompactContent>
    );

    if (href) {
      return (
        <Link
          href={href}
          className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition group block"
        >
          {content}
        </Link>
      );
    }
    return (
      <div className="border border-gray-200 rounded-lg p-3">{content}</div>
    );
  }

  // Full variant
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      {flavor && (
        <p className="text-sm text-gray-500 mb-3 italic">{flavor}</p>
      )}
      <div className="flex gap-4 text-gray-700">
        <StatBadge label="HP" value={health} />
        <StatBadge label="ATK" value={attack} />
        <StatBadge label="SPD" value={speed} />
      </div>
      {children}
    </div>
  );
}
