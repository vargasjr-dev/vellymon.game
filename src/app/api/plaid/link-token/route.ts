import { NextResponse } from "next/server";

export async function POST() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    return NextResponse.json({ error: "Plaid credentials not configured" }, { status: 500 });
  }

  const res = await fetch("https://production.plaid.com/link/token/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      client_name: "VargasJR Sunday Fundsday",
      user: { client_user_id: "vargas-dvargas92495" },
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 400 });
}
