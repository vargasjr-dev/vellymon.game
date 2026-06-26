CREATE TABLE "llmRequest" (
  "id" text PRIMARY KEY NOT NULL,
  "matchId" text NOT NULL,
  "turn" integer NOT NULL,
  "teamId" integer NOT NULL,
  "profileId" text,
  "model" text NOT NULL,
  "systemPrompt" text NOT NULL,
  "userMessage" text NOT NULL,
  "rawResponse" text NOT NULL,
  "commands" json,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
