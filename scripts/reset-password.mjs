import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.mjs <email> <password>");
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("ERROR: Password must be at least 8 characters");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Find user
const users = await sql`SELECT id, name, email FROM "user" WHERE email = ${email}`;

if (users.length === 0) {
  console.error("ERROR: No user found with email:", email);
  process.exit(1);
}

const user = users[0];
console.log(`Found user: ${user.name} (${user.email})`);

// Find credential account
const accounts = await sql`
  SELECT id FROM account
  WHERE "userId" = ${user.id} AND "providerId" = 'credential'
`;

if (accounts.length === 0) {
  console.error("ERROR: No credential account found — may be OAuth-only.");
  process.exit(1);
}

// Hash with better-auth's own hasher (scrypt, salt:hash format)
const hashed = await hashPassword(newPassword);

// Update
await sql`
  UPDATE account
  SET password = ${hashed}
  WHERE "userId" = ${user.id} AND "providerId" = 'credential'
`;

console.log(`✅ Password reset for ${user.email}`);
