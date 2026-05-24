import { NextResponse } from "next/server";
import { db } from "../../../../../data/db";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    return NextResponse.json({ error: "Plaid credentials not configured" }, { status: 500 });
  }

  const { public_token } = await request.json();
  if (!public_token) {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  const res = await fetch("https://production.plaid.com/item/public_token/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, public_token }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    return NextResponse.json(data, { status: 400 });
  }

  // Store in DB — create table if needed, then upsert
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS plaid_tokens (
      id SERIAL PRIMARY KEY,
      access_token TEXT NOT NULL,
      item_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    INSERT INTO plaid_tokens (access_token, item_id)
    VALUES (${data.access_token}, ${data.item_id})
  `);

  return NextResponse.json({ success: true, item_id: data.item_id });
}
