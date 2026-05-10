import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import Link from "next/link";
import { getCosmeticsPageData } from "./actions";
import CosmeticGallery from "./CosmeticGallery";

export default async function CosmeticsPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const data = await getCosmeticsPageData();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🎨 My Cosmetics
          </h1>
          <p className="text-gray-600 mt-1">
            Browse, equip, and manage your custom designs.
          </p>
        </div>
        {data.active && (
          <Link
            href="/cosmetics/create"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow hover:from-purple-700 hover:to-indigo-700 transition-all text-sm"
          >
            + Create New
          </Link>
        )}
      </div>

      <CosmeticGallery
        cosmetics={data.cosmetics}
        active={data.active}
        loadouts={data.loadouts}
      />
    </div>
  );
}
