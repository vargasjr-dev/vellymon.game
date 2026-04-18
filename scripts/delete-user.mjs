import { neon } from "@neondatabase/serverless";

const email = process.argv[2];
const confirm = process.argv[3];

if (!email) {
  console.error("Usage: bun scripts/delete-user.mjs <email> CONFIRM");
  process.exit(1);
}

if (confirm !== "CONFIRM") {
  console.error("ERROR: You must pass CONFIRM as the second argument to proceed.");
  console.error("       bun scripts/delete-user.mjs user@example.com CONFIRM");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Find user
const users = await sql`SELECT id, name, email, "createdAt" FROM "user" WHERE email = ${email}`;

if (users.length === 0) {
  console.error(`ERROR: No user found with email: ${email}`);
  process.exit(1);
}

const user = users[0];
console.log(`Found user: ${user.name} (${user.email})`);
console.log(`  ID: ${user.id}`);
console.log(`  Registered: ${user.createdAt}`);

// Count related records
const sessions = await sql`SELECT COUNT(*) as count FROM session WHERE "userId" = ${user.id}`;
const accounts = await sql`SELECT COUNT(*) as count FROM account WHERE "user_id" = ${user.id}`;
const verifications = await sql`SELECT COUNT(*) as count FROM verification WHERE identifier = ${email}`;
const gamePlayers = await sql`SELECT COUNT(*) as count FROM "gamePlayer" WHERE "userId" = ${user.id}`;

console.log(`\nWill delete:`);
console.log(`  - 1 user record`);
console.log(`  - ${sessions[0].count} session(s) (cascade)`);
console.log(`  - ${accounts[0].count} account(s) (cascade)`);
console.log(`  - ${verifications[0].count} verification(s)`);
console.log(`  - ${gamePlayers[0].count} game player record(s)`);

// Delete in order: game data, verifications, then user (cascades session + account)
await sql`DELETE FROM "gamePlayer" WHERE "userId" = ${user.id}`;
await sql`DELETE FROM verification WHERE identifier = ${email}`;
await sql`DELETE FROM "user" WHERE id = ${user.id}`;

console.log(`\n✅ User ${user.email} fully deleted. They can now re-register.`);
