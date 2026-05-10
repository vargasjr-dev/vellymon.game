import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { getVaultPageData } from "./actions";
import VaultGallery from "./VaultGallery";

export default async function VaultPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const data = await getVaultPageData();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🏛️ Subscriber Vault</h1>
        <p className="text-gray-600 mt-1">
          Unlock premium rewards from past seasons with your credits.
        </p>
      </div>

      <VaultGallery
        items={data.items}
        balance={data.balance}
        subscribed={data.subscribed}
      />
    </div>
  );
}
