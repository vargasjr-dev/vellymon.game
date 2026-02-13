# Database Migration Guide

## Migrating from PR #13 to PR #14 (BetterAuth Schema Fix)

PR #13 created BetterAuth tables with camelCase column names.
PR #14 fixed them to use snake_case (required by BetterAuth).

### One-time migration steps:

1. **Drop old auth tables:**
   ```bash
   npm run db:drop-auth
   ```

2. **Recreate with correct schema:**
   ```bash
   npm run db:push
   ```

⚠️ **Note:** This will delete all existing user accounts, sessions, and auth data.
Only run this in development!

## Future Migrations

The `db:push` script now uses `--force` flag to always create new columns instead of asking to rename when field names change. This prevents interactive prompts during CI/CD.

### Configuration

`drizzle.config.ts` has `breakpoints: true` to help track migration points.
