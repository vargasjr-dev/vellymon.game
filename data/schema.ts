import { pgTable, uuid, varchar, integer, timestamp, json, text, boolean } from "drizzle-orm/pg-core";

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

// BetterAuth required tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: timestamp("expiresAt"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
