import { notFound, redirect } from "next/navigation";
import { db } from "../../../../../data/db";
import { user } from "../../../../../data/schema";
import { eq } from "drizzle-orm";

/**
 * Vanity URL: /profile/@vargas42 → resolves to /profile/[userId]
 * The "@" prefix is part of the Next.js route segment name.
 */
export default async function VanityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, slug.toLowerCase()))
    .limit(1);

  if (!row) notFound();

  redirect(`/profile/${row.id}`);
}
