import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";

export const robotInstance = pgTable("robotInstance", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  address: varchar("address", { length: 64 }).notNull().unique(),
  network: integer("network").notNull().unique(),
  version: varchar("version", { length: 17 }).notNull(),
  userId: varchar("userId", { length: 32 }).notNull(),
  modelUuid: uuid("modelUuid").notNull(),
});
