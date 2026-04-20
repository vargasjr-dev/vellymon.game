import { auth } from "~/lib/auth.server";
import { headers } from "next/headers";
import listMarket from "~/data/listMarket.server";
import getOwnedModelUuids from "~/data/getOwnedModelUuids.server";
import MarketGrid from "./MarketGrid";

export default async function MarketPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [vellymons, ownedUuids] = await Promise.all([
    Promise.resolve(listMarket()),
    getOwnedModelUuids(session.user.id),
  ]);

  // Sort alphabetically, tag owned status
  const sorted = [...vellymons]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((v) => ({
      ...v,
      isOwned: ownedUuids.has(v.uuid),
    }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-2 text-center">Vellymon Market</h1>
      <p className="text-gray-500 text-center mb-8">
        {vellymons.length} vellymons available ·{" "}
        {ownedUuids.size} owned
      </p>

      <MarketGrid vellymons={sorted} />
    </div>
  );
}
