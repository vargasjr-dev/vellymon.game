import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./data/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Always create new columns instead of renaming when field names change
  breakpoints: true,
});
