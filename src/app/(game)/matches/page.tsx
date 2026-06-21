import { redirect } from "next/navigation";

// The match list and matchmaking now live at /ranked.
// Individual match pages (/matches/[id]) are unaffected.
export default function MatchesPage() {
  redirect("/ranked");
}
