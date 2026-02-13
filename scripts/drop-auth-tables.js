#!/usr/bin/env node

/**
 * Drop BetterAuth tables to allow clean recreation with correct schema.
 * 
 * Run this once before db:push when migrating from old auth schema
 * to avoid column name conflicts (e.g., camelCase -> snake_case).
 * 
 * Usage: npm run db:drop-auth
 */

const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

async function dropAuthTables() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log("🗑️  Dropping BetterAuth tables...");

  try {
    // Drop in reverse order of dependencies
    await sql`DROP TABLE IF EXISTS "verification" CASCADE`;
    console.log("  ✓ Dropped verification");

    await sql`DROP TABLE IF EXISTS "account" CASCADE`;
    console.log("  ✓ Dropped account");

    await sql`DROP TABLE IF EXISTS "session" CASCADE`;
    console.log("  ✓ Dropped session");

    await sql`DROP TABLE IF EXISTS "user" CASCADE`;
    console.log("  ✓ Dropped user");

    console.log("\n✅ All BetterAuth tables dropped successfully!");
    console.log("💡 Now run: npm run db:push");
  } catch (error) {
    console.error("\n❌ Error dropping tables:", error.message);
    process.exit(1);
  }
}

dropAuthTables();
