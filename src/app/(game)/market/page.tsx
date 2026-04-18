import listMarket from "~/data/listMarket.server";
import BuyButton from "./BuyButton";

export default async function MarketPage() {
  const vellymons = listMarket();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Vellymon Market</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vellymons.map((vellymon) => (
          <div key={vellymon.uuid} className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-4">{vellymon.name}</h3>
            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-semibold">Health:</span> {vellymon.health}
              </p>
              <p>
                <span className="font-semibold">Attack:</span> {vellymon.attack}
              </p>
              <p>
                <span className="font-semibold">Speed:</span> {vellymon.speed}
              </p>
              <p>
                <span className="font-semibold">Energy:</span> {vellymon.energy}
              </p>
            </div>
            <BuyButton modelUuid={vellymon.uuid} />
          </div>
        ))}
      </div>
    </div>
  );
}
