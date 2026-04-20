import listMarket from "~/data/listMarket.server";
import VellymonCard from "~/components/VellymonCard";
import BuyButton from "./BuyButton";

export default async function MarketPage() {
  const vellymons = listMarket();

  // Sort alphabetically — let players discover patterns themselves
  const sorted = [...vellymons].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-2 text-center">Vellymon Market</h1>
      <p className="text-gray-500 text-center mb-8">
        {vellymons.length} vellymons available
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sorted.map((vellymon) => (
          <VellymonCard
            key={vellymon.uuid}
            name={vellymon.name}
            health={vellymon.health}
            attack={vellymon.attack}
            speed={vellymon.speed}
            energy={vellymon.energy}
            flavor={vellymon.flavor}
            imageUrl={vellymon.imageUrl}
            variant="compact"
          >
            <BuyButton
              modelUuid={vellymon.uuid}
              vellymonName={vellymon.name}
            />
          </VellymonCard>
        ))}
      </div>
    </div>
  );
}
