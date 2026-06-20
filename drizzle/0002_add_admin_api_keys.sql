-- Migration: add adminApiKey table for named programmatic API access
CREATE TABLE IF NOT EXISTS "adminApiKey" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"        varchar(64) NOT NULL,
  "keyHash"     text NOT NULL UNIQUE,
  "keyPrefix"   varchar(16) NOT NULL,
  "createdBy"   text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "createdAt"   timestamp NOT NULL DEFAULT now(),
  "lastUsedAt"  timestamp,
  "revokedAt"   timestamp
);

CREATE INDEX IF NOT EXISTS "adminApiKey_keyHash_idx" ON "adminApiKey" ("keyHash");
