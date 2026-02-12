export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 text-gray-900">
            Play and Earn through your army of vellymons
          </h1>
          <p className="text-2xl text-gray-700">
            Vellymon pits players against each other in a simultaneous action RPG
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-8 text-center">Rule the arena through battle</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded p-6">
              <h3 className="text-xl font-semibold mb-2">Collect Vellymons</h3>
              <p className="text-gray-600">Build your roster of powerful vellymons from the market</p>
            </div>
            
            <div className="border border-gray-200 rounded p-6">
              <h3 className="text-xl font-semibold mb-2">Battle Other Players</h3>
              <p className="text-gray-600">Compete in simultaneous action RPG matches</p>
            </div>
            
            <div className="border border-gray-200 rounded p-6">
              <h3 className="text-xl font-semibold mb-2">Strategic Gameplay</h3>
              <p className="text-gray-600">Master tactics and positioning to dominate the arena</p>
            </div>
            
            <div className="border border-gray-200 rounded p-6">
              <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
              <p className="text-gray-600">Win battles and grow your collection</p>
            </div>
          </div>

          <div className="text-center">
            <a 
              href="/login" 
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
