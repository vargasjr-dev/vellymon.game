-- Drop the userAchievement table entirely.
-- The achievements system has been removed before launch.
DROP INDEX IF EXISTS "userAchievement_userId_achievementId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "userAchievement_userId_idx";--> statement-breakpoint
DROP TABLE "userAchievement";
