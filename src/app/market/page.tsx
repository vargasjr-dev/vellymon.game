import listMarket from "../../data/listMarket.server";

export default async function MarketPage() {
  const vellymons = listMarket();

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8 text-center">Vellymon Market</h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vellymons.map((vellymon) => (
            <div key={vellymon.uuid} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold mb-4">{vellymon.name}</h3>
              <div className="space-y-2 text-gray-700">
                <p><span className="font-semibold">Health:</span> {vellymon.health}</p>
                <p><span className="font-semibold">Attack:</span> {vellymon.attack}</p>
                <p><span className="font-semibold">Speed:</span> {vellymon.speed}</p>
                <p><span className="font-semibold">Energy:</span> {vellymon.energy}</p>
              </div>
              <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
