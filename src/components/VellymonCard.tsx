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
  children?: React.ReactNode;
}

const statLabel: Record<string, string> = {
  health: "HP",
  attack: "ATK",
  speed: "SPD",
  energy: "NRG",
};

function CompactContent({
  name,
  stats,
  children,
}: {
  name: string;
  stats: Record<string, number>;
  children?: React.ReactNode;
}) {
  return (
    <>
      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2">
        {name}
      </h3>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key}>
            <span className="text-gray-400">{statLabel[key]}</span>{" "}
            <span className="font-semibold">{value}</span>
          </div>
        ))}
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
  energy,
  href,
  variant = "full",
  children,
}: VellymonCardProps) {
  const stats = { health, attack, speed, energy };

  if (variant === "compact") {
    if (href) {
      return (
        <Link
          href={href}
          className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition group block"
        >
          <CompactContent name={name} stats={stats}>
            {children}
          </CompactContent>
        </Link>
      );
    }
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <CompactContent name={name} stats={stats}>
          {children}
        </CompactContent>
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold mb-4">{name}</h3>
      <div className="space-y-2 text-gray-700">
        {Object.entries(stats).map(([key, value]) => (
          <p key={key}>
            <span className="font-semibold capitalize">{key}:</span> {value}
          </p>
        ))}
      </div>
      {children}
    </div>
  );
}
