import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { getCosmeticsPageData } from "./actions";
import CosmeticGallery from "./CosmeticGallery";

export default async function CosmeticsPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const data = await getCosmeticsPageData();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🎨 My Cosmetics</h1>
        <p className="text-gray-600 mt-1">
          Browse, equip, and manage your custom designs.
        </p>
      </div>

      <CosmeticGallery
        cosmetics={data.cosmetics}
        active={data.active}
        loadouts={data.loadouts}
      />
    </div>
  );
}
