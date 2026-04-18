import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import GameNav from "~/components/GameNav";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  const user = session
    ? { name: session.user.name, email: session.user.email }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <GameNav user={user} />
      <main>{children}</main>
    </div>
  );
}
