import listMarket from "~/data/listMarket.server";
import VellymonCard from "~/components/VellymonCard";
import BuyButton from "./BuyButton";

export default async function MarketPage() {
  const vellymons = listMarket();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Vellymon Market</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vellymons.map((vellymon) => (
          <VellymonCard
            key={vellymon.uuid}
            name={vellymon.name}
            health={vellymon.health}
            attack={vellymon.attack}
            speed={vellymon.speed}
            energy={vellymon.energy}
          >
            <BuyButton modelUuid={vellymon.uuid} />
          </VellymonCard>
        ))}
      </div>
    </div>
  );
}
