import { redirect } from "next/navigation";
import { auth } from "../../lib/auth.server";
import { headers } from "next/headers";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session) {
    redirect("/player");
  }

  return <SignupForm />;
}
