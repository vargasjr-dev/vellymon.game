import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vellymon Game",
  description: "A multiplayer RPG game where you battle with your army of vellymons",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
