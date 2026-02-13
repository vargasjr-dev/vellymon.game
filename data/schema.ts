import { pgTable, uuid, varchar, integer, timestamp, json, text, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

// BetterAuth required tables (generated via @better-auth/cli generate)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
