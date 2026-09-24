import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "pesquisador", "revisor", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const materials = mysqlTable("materials", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: mysqlEnum("category", ["reciclaveis", "organicos", "eletroeletronicos", "perigosos"]).notNull(),
  disposalInstruction: text("disposalInstruction").notNull(),
  impactNote: text("impactNote").notNull(),
  icon: varchar("icon", { length: 48 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const collectionPoints = mysqlTable("collection_points", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  latitude: varchar("latitude", { length: 24 }).notNull(),
  longitude: varchar("longitude", { length: 24 }).notNull(),
  acceptedCategories: text("acceptedCategories").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const quizQuestions = mysqlTable("quiz_questions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  prompt: text("prompt").notNull(),
  explanation: text("explanation").notNull(),
  points: int("points").default(50).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const quizOptions = mysqlTable("quiz_options", {
  id: varchar("id", { length: 64 }).primaryKey(),
  questionId: varchar("questionId", { length: 64 }).notNull(),
  label: text("label").notNull(),
  isCorrect: boolean("isCorrect").default(false).notNull(),
});

export const userProgress = mysqlTable("user_progress", {
  userId: int("userId").primaryKey(),
  ecoPoints: int("ecoPoints").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  badgesUnlocked: int("badgesUnlocked").default(0).notNull(),
  lastActivityAt: timestamp("lastActivityAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const quizAttempts = mysqlTable("quiz_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: varchar("questionId", { length: 64 }).notNull(),
  selectedOptionId: varchar("selectedOptionId", { length: 64 }).notNull(),
  isCorrect: boolean("isCorrect").notNull(),
  awardedPoints: int("awardedPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const usabilityResponses = mysqlTable("usability_responses", {
  id: int("id").autoincrement().primaryKey(),
  participantCode: varchar("participantCode", { length: 80 }).notNull(),
  consented: boolean("consented").notNull(),
  susAnswers: text("susAnswers").notNull(),
  computedScore: int("computedScore").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
