import { redirect } from "next/navigation";

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/roster/teams/${id}/edit`);
}
