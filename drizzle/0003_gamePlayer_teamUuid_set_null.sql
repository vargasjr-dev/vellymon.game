-- Make gamePlayer.teamUuid nullable so deleting a team doesn't block historical match records.
-- Drop the old no-action FK, make column nullable, re-add with ON DELETE SET NULL.

ALTER TABLE "gamePlayer" DROP CONSTRAINT "gamePlayer_teamUuid_team_uuid_fk";--> statement-breakpoint
ALTER TABLE "gamePlayer" ALTER COLUMN "teamUuid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gamePlayer" ADD CONSTRAINT "gamePlayer_teamUuid_team_uuid_fk" FOREIGN KEY ("teamUuid") REFERENCES "public"."team"("uuid") ON DELETE set null ON UPDATE no action;
