/**
 * POST /api/admin/promote
 *
 * Promotes a user to admin role. Two auth methods:
 * 1. ADMIN_SECRET env var — pass as Authorization: Bearer <secret>
 * 2. Self-promotion — if the caller's email is in ADMIN_EMAILS env var
 *
 * Body: { email: string }
 * Returns: { success: true, email: string, role: "admin" }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../data/db";
import { user } from "../../../../../data/schema";
import { auth } from "../../../../lib/auth.server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const targetEmail = body?.email;

  if (!targetEmail || typeof targetEmail !== "string") {
    return NextResponse.json(
      { error: "Missing required field: email" },
      { status: 400 },
    );
  }

  // Auth method 1: ADMIN_SECRET header
  const authHeader = request.headers.get("authorization");
  const adminSecret = process.env.ADMIN_SECRET;
  const secretAuth =
    adminSecret && authHeader === `Bearer ${adminSecret}`;

  // Auth method 2: Self-promotion via ADMIN_EMAILS
  let emailAuth = false;
  if (!secretAuth) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length > 0) {
      const headersList = await headers();
      const session = await auth.api.getSession({ headers: headersList });
      if (
        session?.user?.email &&
        adminEmails.includes(session.user.email.toLowerCase())
      ) {
        emailAuth = true;
      }
    }
  }

  if (!secretAuth && !emailAuth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Promote the target user
  const result = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, targetEmail.toLowerCase()))
    .returning({ id: user.id, email: user.email, role: user.role });

  if (result.length === 0) {
    return NextResponse.json(
      { error: `User not found: ${targetEmail}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    email: result[0].email,
    role: result[0].role,
  });
}
