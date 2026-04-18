import { redirect } from "next/navigation";
import { auth } from "../../lib/auth.server";
import { headers } from "next/headers";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session) {
    redirect("/player");
  }

  return <LoginForm />;
}
