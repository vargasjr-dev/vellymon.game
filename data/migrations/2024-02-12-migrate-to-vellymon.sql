-- Rename robot_instances table to vellymonInstance
ALTER TABLE IF EXISTS robot_instances RENAME TO vellymonInstance;

-- Rename columns to match new schema
ALTER TABLE IF EXISTS vellymonInstance RENAME COLUMN user_id TO userId;
ALTER TABLE IF EXISTS vellymonInstance RENAME COLUMN model_uuid TO modelUuid;

-- Create game session tables
CREATE TABLE IF NOT EXISTS gameSession (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploymentId VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  createdBy VARCHAR(32) NOT NULL,
  maxPlayers INTEGER NOT NULL DEFAULT 4,
  currentPlayers INTEGER NOT NULL DEFAULT 0,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS gamePlayer (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameSessionUuid UUID NOT NULL REFERENCES gameSession(uuid),
  userId VARCHAR(32) NOT NULL,
  joinedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'active'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vellymonInstance_userId ON vellymonInstance(userId);
CREATE INDEX IF NOT EXISTS idx_gameSession_status ON gameSession(status);
CREATE INDEX IF NOT EXISTS idx_gamePlayer_gameSessionUuid ON gamePlayer(gameSessionUuid);
CREATE INDEX IF NOT EXISTS idx_gamePlayer_userId ON gamePlayer(userId);
