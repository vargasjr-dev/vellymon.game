## What this PR does


## Migration Checklist

If this PR changes `data/schema.ts` or model identifiers (UUIDs, enum values, column names):

- [ ] Existing records in production will still work after deploy
- [ ] A Drizzle migration has been generated (`bunx drizzle-kit generate`), OR
- [ ] The change is backward-compatible (additive columns with defaults, new tables, etc.)
- [ ] No column renames or type changes without a migration plan

_If this PR does NOT touch the schema, delete this section._
