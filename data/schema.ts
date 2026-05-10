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

export const gameSession = pgTable(
  "gameSession",
  {
    uuid: uuid("uuid").primaryKey().defaultRandom(),
    deploymentId: varchar("deploymentId", { length: 256 }), // nullable — no server until match starts
    status: varchar("status", { length: 32 }).notNull().default("waiting"), // waiting, ready, playing, completed, cancelled
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: text("createdBy")
      .notNull()
      .references(() => user.id),
    maxPlayers: integer("maxPlayers").notNull().default(2), // 1v1 format
    currentPlayers: integer("currentPlayers").notNull().default(1), // creator counts
    metadata: json("metadata"),
  },
  (table) => [index("gameSession_createdBy_idx").on(table.createdBy)],
);

export const gamePlayer = pgTable(
  "gamePlayer",
  {
    uuid: uuid("uuid").primaryKey().defaultRandom(),
    gameSessionUuid: uuid("gameSessionUuid")
      .notNull()
      .references(() => gameSession.uuid, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    teamUuid: uuid("teamUuid")
      .notNull()
      .references(() => team.uuid),
    joinedAt: timestamp("joinedAt").notNull().defaultNow(),
    status: varchar("status", { length: 32 }).notNull().default("active"), // active, left, kicked
  },
  (table) => [
    index("gamePlayer_gameSessionUuid_idx").on(table.gameSessionUuid),
    index("gamePlayer_userId_idx").on(table.userId),
  ],
);

// Team system — 8 vellymons per team, 4 active in match lineup
export const team = pgTable(
  "team",
  {
    uuid: uuid("uuid").primaryKey().defaultRandom(),
    name: varchar("name", { length: 64 }).notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("team_userId_idx").on(table.userId)],
);

export const teamSlot = pgTable(
  "teamSlot",
  {
    uuid: uuid("uuid").primaryKey().defaultRandom(),
    teamUuid: uuid("teamUuid")
      .notNull()
      .references(() => team.uuid, { onDelete: "cascade" }),
    vellymonInstanceUuid: uuid("vellymonInstanceUuid")
      .notNull()
      .references(() => vellymonInstance.uuid, { onDelete: "cascade" }),
    slotIndex: integer("slotIndex").notNull(), // 0-7 position in roster
    isActive: boolean("isActive").default(false).notNull(), // true = in the 4-slot match lineup
  },
  (table) => [
    index("teamSlot_teamUuid_idx").on(table.teamUuid),
    index("teamSlot_vellymonInstanceUuid_idx").on(table.vellymonInstanceUuid),
  ],
);

// BetterAuth required tables (generated via @better-auth/cli generate)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image: text("image"),
  role: text("role").default("user").notNull(), // "user" | "admin"
  // ─── Subscription fields ───────────────────────────────────────────────────
  stripeCustomerId: text("stripeCustomerId").unique(),
  subscriptionId: text("subscriptionId"),
  subscriptionStatus: text("subscriptionStatus").default("none").notNull(), // none | active | past_due | canceled
  subscribedAt: timestamp("subscribedAt"),
  subscriptionStreakMonths: integer("subscriptionStreakMonths").default(0).notNull(),
  // ───────────────────────────────────────────────────────────────────────────
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("expiresAt"),
    password: text("password"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
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
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  teams: many(team),
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

export const teamRelations = relations(team, ({ one, many }) => ({
  user: one(user, {
    fields: [team.userId],
    references: [user.id],
  }),
  slots: many(teamSlot),
}));

export const teamSlotRelations = relations(teamSlot, ({ one }) => ({
  team: one(team, {
    fields: [teamSlot.teamUuid],
    references: [team.uuid],
  }),
  vellymonInstance: one(vellymonInstance, {
    fields: [teamSlot.vellymonInstanceUuid],
    references: [vellymonInstance.uuid],
  }),
}));

// ─── Currency & Credits System ───────────────────────────────────────────────

export const userCurrency = pgTable("userCurrency", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").default(0).notNull(),
  lifetimeEarned: integer("lifetimeEarned").default(0).notNull(),
  lifetimeSpent: integer("lifetimeSpent").default(0).notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const currencyTransaction = pgTable(
  "currencyTransaction",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // positive = credit, negative = debit
    type: text("type").notNull(), // monthly_grant | purchase | spend | refund
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("currencyTransaction_userId_idx").on(table.userId),
    index("currencyTransaction_createdAt_idx").on(table.createdAt),
  ],
);

export const userCurrencyRelations = relations(userCurrency, ({ one }) => ({
  user: one(user, {
    fields: [userCurrency.userId],
    references: [user.id],
  }),
}));

export const currencyTransactionRelations = relations(
  currencyTransaction,
  ({ one }) => ({
    user: one(user, {
      fields: [currencyTransaction.userId],
      references: [user.id],
    }),
  }),
);

// ─── Cosmetic System ─────────────────────────────────────────────────────────

export const cosmetic = pgTable(
  "cosmetic",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vellymonId: uuid("vellymonId"), // nullable — global cosmetics (board themes, profile borders)
    type: text("type").notNull(), // skin | vfx_harvest | vfx_attack | vfx_ko | board_theme | profile_border | title
    name: text("name").notNull(),
    imageUrl: text("imageUrl"), // URL to generated/stored asset
    metadata: json("metadata"), // { prompt, styleParams, generationId, ... }
    source: text("source").notNull(), // generated | seasonal | monthly_drop | ranked_reward
    seasonId: text("seasonId"), // nullable — ties cosmetic to a specific season
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("cosmetic_userId_idx").on(table.userId),
    index("cosmetic_vellymonId_idx").on(table.vellymonId),
    index("cosmetic_type_idx").on(table.type),
  ],
);

export const cosmeticLoadout = pgTable(
  "cosmeticLoadout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vellymonId: uuid("vellymonId").notNull(), // which vellymon this loadout applies to
    equippedSkinId: uuid("equippedSkinId").references(() => cosmetic.id, {
      onDelete: "set null",
    }),
    equippedVfxIds: json("equippedVfxIds").$type<string[]>().default([]), // array of cosmetic IDs
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cosmeticLoadout_userId_idx").on(table.userId),
    index("cosmeticLoadout_vellymonId_idx").on(table.vellymonId),
  ],
);

export const cosmeticRelations = relations(cosmetic, ({ one }) => ({
  user: one(user, {
    fields: [cosmetic.userId],
    references: [user.id],
  }),
}));

export const cosmeticLoadoutRelations = relations(
  cosmeticLoadout,
  ({ one }) => ({
    user: one(user, {
      fields: [cosmeticLoadout.userId],
      references: [user.id],
    }),
    equippedSkin: one(cosmetic, {
      fields: [cosmeticLoadout.equippedSkinId],
      references: [cosmetic.id],
    }),
  }),
);

// ─── Season & Track System ───────────────────────────────────────────────────

export const season = pgTable("season", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: text("status").default("upcoming").notNull(), // upcoming | active | archived
  newVellymonId: integer("newVellymonId"), // ID in vellymon library for this season's new vellymon
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const seasonTrack = pgTable(
  "seasonTrack",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("seasonId")
      .notNull()
      .references(() => season.id, { onDelete: "cascade" }),
    tier: integer("tier").notNull(), // 1-25
    freeReward: json("freeReward"), // { type, description, cosmeticId?, credits?, ... }
    premiumReward: json("premiumReward"), // same shape, premium track
  },
  (table) => [
    index("seasonTrack_seasonId_idx").on(table.seasonId),
  ],
);

export const userSeasonProgress = pgTable(
  "userSeasonProgress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seasonId: uuid("seasonId")
      .notNull()
      .references(() => season.id, { onDelete: "cascade" }),
    xp: integer("xp").default(0).notNull(),
    currentTier: integer("currentTier").default(0).notNull(),
    claimedFreeTiers: json("claimedFreeTiers").$type<number[]>().default([]),
    claimedPremiumTiers: json("claimedPremiumTiers").$type<number[]>().default([]),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("userSeasonProgress_userId_idx").on(table.userId),
    index("userSeasonProgress_seasonId_idx").on(table.seasonId),
  ],
);

export const seasonRelations = relations(season, ({ many }) => ({
  tracks: many(seasonTrack),
  progress: many(userSeasonProgress),
}));

export const seasonTrackRelations = relations(seasonTrack, ({ one }) => ({
  season: one(season, {
    fields: [seasonTrack.seasonId],
    references: [season.id],
  }),
}));

export const userSeasonProgressRelations = relations(
  userSeasonProgress,
  ({ one }) => ({
    user: one(user, {
      fields: [userSeasonProgress.userId],
      references: [user.id],
    }),
    season: one(season, {
      fields: [userSeasonProgress.seasonId],
      references: [season.id],
    }),
  }),
);
