import { redirect } from "next/navigation";
import { auth } from "../../lib/auth.server";
import { headers } from "next/headers";
import getVellymonRoster from "../../data/getVellymonRoster.server";

export default async function PlayerPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ 
    headers: headersList 
  });
  
  if (!session) {
    redirect("/login");
  }

  const roster = await getVellymonRoster(session.user.id);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8 text-center">Your Vellymon Roster</h1>
        
        {roster.length === 0 ? (
          <div className="text-center bg-white rounded-lg shadow-xl p-12">
            <p className="text-xl text-gray-600 mb-4">You don't have any vellymons yet!</p>
            <a 
              href="/market" 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Visit the Market
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roster.map((vellymon) => (
              <div key={vellymon.uuid} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4">{vellymon.name}</h3>
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-semibold">Health:</span> {vellymon.health}</p>
                  <p><span className="font-semibold">Attack:</span> {vellymon.attack}</p>
                  <p><span className="font-semibold">Speed:</span> {vellymon.speed}</p>
                  <p><span className="font-semibold">Energy:</span> {vellymon.energy}</p>
                  <p className="text-sm text-gray-500 mt-4">Address: {vellymon.address}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
