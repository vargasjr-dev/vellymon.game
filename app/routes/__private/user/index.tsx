import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({ user: session.user });
}

const UserIndex = () => {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="border-dashed border-r-4 border-gray-400 border-4 text-center py-8">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <div className="space-y-2">
        <p>Email: {user.email}</p>
        <p>ID: {user.id}</p>
      </div>
    </div>
  );
};

export default UserIndex;
