import GameNav from "~/components/GameNav";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <GameNav />
      <main>{children}</main>
    </div>
  );
}
