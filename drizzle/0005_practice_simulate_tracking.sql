-- Track who triggered each automated match simulation + how long it took.
-- triggeredByUserId: null for CLI/admin uploads; set for user-facing practice simulations.
-- simulationMs: wall-clock time of the simulation loop (proxy for compute cost).

ALTER TABLE "matchSnapshot" ADD COLUMN "triggeredByUserId" text;
ALTER TABLE "matchSnapshot" ADD COLUMN "simulationMs" integer;
