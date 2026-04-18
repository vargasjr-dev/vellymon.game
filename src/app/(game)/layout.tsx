import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth.server";
import GameNav from "~/components/GameNav";
import { ToastProvider } from "~/components/Toast";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Single auth gate — all pages in this route group require authentication
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <ToastProvider>
        <GameNav
          user={{ name: session.user.name, email: session.user.email }}
        />
        <main>{children}</main>
      </ToastProvider>
    </div>
  );
}
