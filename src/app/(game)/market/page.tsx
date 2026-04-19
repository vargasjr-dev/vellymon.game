import listMarket from "~/data/listMarket.server";
import VellymonCard from "~/components/VellymonCard";
import BuyButton from "./BuyButton";

const ARCHETYPE_ORDER = ["Tank", "Speedster", "Glass Cannon", "Support", "Balanced"];

export default async function MarketPage() {
  const vellymons = listMarket();

  // Group by archetype
  const grouped = new Map<string, typeof vellymons>();
  for (const v of vellymons) {
    const arch = v.archetype ?? "Unknown";
    if (!grouped.has(arch)) grouped.set(arch, []);
    grouped.get(arch)!.push(v);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-2 text-center">Vellymon Market</h1>
      <p className="text-gray-500 text-center mb-8">
        {vellymons.length} vellymons available · 5 archetypes
      </p>

      {ARCHETYPE_ORDER.map((archetype) => {
        const group = grouped.get(archetype);
        if (!group) return null;
        const emoji = group[0]?.archetypeEmoji ?? "";

        return (
          <section key={archetype} className="mb-10">
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <span>{emoji}</span> {archetype}
              <span className="text-sm font-normal text-gray-500">
                ({group.length})
              </span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {archetype === "Tank" && "High HP, low speed. The wall."}
              {archetype === "Speedster" && "Blazing speed, low HP. First to act."}
              {archetype === "Glass Cannon" && "Huge attack, fragile. Hits like a truck."}
              {archetype === "Support" && "Fast harvester, low attack. Energy engine."}
              {archetype === "Balanced" && "No weakness, no standout. Adaptable."}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.map((vellymon) => (
                <VellymonCard
                  key={vellymon.uuid}
                  name={vellymon.name}
                  health={vellymon.health}
                  attack={vellymon.attack}
                  speed={vellymon.speed}
                  energy={vellymon.energy}
                  archetype={vellymon.archetype}
                  archetypeEmoji={vellymon.archetypeEmoji}
                  flavor={vellymon.flavor}
                  variant="compact"
                >
                  <BuyButton
                    modelUuid={vellymon.uuid}
                    vellymonName={vellymon.name}
                  />
                </VellymonCard>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
