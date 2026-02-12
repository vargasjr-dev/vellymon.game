import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth.server";
import { headers } from "next/headers";
import getVellymonByUuid from "../../../data/getVellymon.server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const headersList = await headers();
  const session = await auth.api.getSession({ 
    headers: headersList 
  });
  
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const vellymon = await getVellymonByUuid(id);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold mb-8 text-center">{vellymon.name}</h1>
          
          <div className="space-y-4">
            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm">Health</p>
              <p className="text-2xl font-semibold">{vellymon.health}</p>
            </div>
            
            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm">Attack</p>
              <p className="text-2xl font-semibold">{vellymon.attack}</p>
            </div>
            
            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm">Priority</p>
              <p className="text-2xl font-semibold">{vellymon.priority}</p>
            </div>
            
            <div className="mt-6">
              <a 
                href="/player" 
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
              >
                Back to Roster
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
