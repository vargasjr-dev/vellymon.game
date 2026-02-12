import { pgTable, uuid, varchar, integer, timestamp, json } from "drizzle-orm/pg-core";

export const vellymonInstance = pgTable("vellymonInstance", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  address: varchar("address", { length: 64 }).notNull().unique(),
  network: integer("network").notNull().unique(),
  version: varchar("version", { length: 17 }).notNull(),
  userId: varchar("userId", { length: 32 }).notNull(),
  modelUuid: uuid("modelUuid").notNull(),
});

export const gameSession = pgTable("gameSession", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  deploymentId: varchar("deploymentId", { length: 256 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, completed, error
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  createdBy: varchar("createdBy", { length: 32 }).notNull(),
  maxPlayers: integer("maxPlayers").notNull().default(4),
  currentPlayers: integer("currentPlayers").notNull().default(0),
  metadata: json("metadata"),
});

export const gamePlayer = pgTable("gamePlayer", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  gameSessionUuid: uuid("gameSessionUuid").notNull().references(() => gameSession.uuid),
  userId: varchar("userId", { length: 32 }).notNull(),
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, left, kicked
});
