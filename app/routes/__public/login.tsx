import React from "react";
import { Form } from "@remix-run/react";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { auth } from "~/lib/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return json({ error: "Invalid form data" }, { status: 400 });
  }

  try {
    const session = await auth.api.signInEmail({
      body: { email, password },
      headers: request.headers,
    });

    if (session) {
      return redirect("/user");
    }
  } catch (error) {
    return json({ error: "Invalid credentials" }, { status: 401 });
  }

  return json({ error: "Login failed" }, { status: 500 });
}

const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold">Sign in to Vellymon</h2>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border p-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border p-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;
