import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"), // nullable for Replit Auth users
  payCycle: text("pay_cycle").default("fortnightly"),
  payCycleStartDate: timestamp("pay_cycle_start_date"), // When first income payment started
  budgetName: text("budget_name").default("Personal Budget"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"), // TOTP secret key
  backupCodes: text("backup_codes").array(), // array of backup codes
  phoneNumber: text("phone_number"), // for SMS 2FA
  emailVerified: boolean("email_verified").default(false),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  replitId: text("replit_id").unique(), // Replit user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'checking', 'savings', 'credit'
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
});

export const envelopes = pgTable("envelopes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").default("📁"),
  parentId: integer("parent_id"), // for hierarchical categories
  categoryId: integer("category_id"),
  sortOrder: integer("sort_order").default(0),
  budgetedAmount: decimal("budgeted_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  openingBalance: decimal("opening_balance", { precision: 10, scale: 2 }).default("0.00"),
  budgetFrequency: text("budget_frequency").default("monthly"), // weekly, fortnightly, monthly, quarterly, annual
  nextPaymentDue: timestamp("next_payment_due"),
  isSpendingAccount: boolean("is_spending_account").default(false), // true for no predicted spend budget
  isMonitored: boolean("is_monitored").default(false), // true for envelopes to monitor on dashboard
  isActive: boolean("is_active").notNull().default(true),
  // Zero-based budget setup fields
  annualAmount: decimal("annual_amount", { precision: 10, scale: 2 }).default("0.00"),
  payCycleAmount: decimal("pay_cycle_amount", { precision: 10, scale: 2 }).default("0.00"),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).default("0.00"), // Target bill amount for expense envelopes
  envelopeType: text("envelope_type").default("expense"), // expense, saving, goal, income
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const envelopeTypes = pgTable("envelope_types", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(), // CSS color class like "bg-red-100 text-red-800"
  isDefault: boolean("is_default").default(false), // true for system defaults
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const envelopeCategories = pgTable("envelope_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").default("#3b82f6"),
  sortOrder: integer("sort_order").default(0),
  isCollapsed: boolean("is_collapsed").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountId: integer("account_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  merchant: text("merchant").notNull(), // Store name/merchant
  description: text("description"), // Optional additional description
  date: timestamp("date").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  isTransfer: boolean("is_transfer").notNull().default(false),
  transferToAccountId: integer("transfer_to_account_id"),
  receiptUrl: text("receipt_url"), // For uploaded receipts
  // Bank sync fields for duplicate detection
  bankTransactionId: text("bank_transaction_id"), // Unique ID from bank
  sourceType: text("source_type").default("manual"), // "manual", "bank_sync", "import"
  duplicateStatus: text("duplicate_status").default("none"), // "none", "potential", "confirmed", "merged"
  duplicateOfId: integer("duplicate_of_id").references(() => transactions.id),
  bankHash: text("bank_hash"), // Hash for matching: amount + date + merchant_normalized
  bankReference: text("bank_reference"), // Bank transaction reference/unique ID
  bankMemo: text("bank_memo"), // Bank memo/description field
});

export const transactionEnvelopes = pgTable("transaction_envelopes", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  envelopeId: integer("envelope_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

export const categoryRules = pgTable("category_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pattern: text("pattern").notNull(), // merchant pattern to match
  envelopeId: integer("envelope_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const merchantMemory = pgTable("merchant_memory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  merchant: text("merchant").notNull(),
  lastEnvelopeId: integer("last_envelope_id").notNull(),
  frequency: integer("frequency").notNull().default(1), // How many times used
  lastUsed: timestamp("last_used").notNull(),
});

export const recurringTransactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  merchant: text("merchant").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // weekly, fortnightly, monthly, quarterly, annual
  nextDate: timestamp("next_date").notNull(),
  endDate: timestamp("end_date"), // Optional end date
  isIncome: boolean("is_income").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recurringTransactionSplits = pgTable("recurring_transaction_splits", {
  id: serial("id").primaryKey(),
  recurringTransactionId: integer("recurring_transaction_id").notNull().references(() => recurringTransactions.id, { onDelete: "cascade" }),
  envelopeId: integer("envelope_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

// Labels for transaction categorization
export const labels = pgTable("labels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3B82F6"), // blue
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactionLabels = pgTable("transaction_labels", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  labelId: integer("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
});

export type TransactionLabel = typeof transactionLabels.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
});

export const insertEnvelopeSchema = createInsertSchema(envelopes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEnvelopeSchema = createInsertSchema(envelopes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  isApproved: true,
}).extend({
  envelopes: z.array(z.object({
    envelopeId: z.number(),
    amount: z.string(),
  })).optional(),
  // Recurring transaction fields
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annual"]).optional(),
  recurringEndDate: z.date().optional(),
  recurringName: z.string().optional(),
});

export const insertMerchantMemorySchema = createInsertSchema(merchantMemory).omit({
  id: true,
});

export const insertCategoryRuleSchema = createInsertSchema(categoryRules).omit({
  id: true,
});

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringTransactionSplitSchema = createInsertSchema(recurringTransactionSplits).omit({
  id: true,
});

export const insertLabelSchema = createInsertSchema(labels).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionLabelSchema = createInsertSchema(transactionLabels).omit({
  id: true,
});

// Net Worth tables
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const liabilities = pgTable("liabilities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  minimumPayment: decimal("minimum_payment", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const netWorthSnapshots = pgTable("net_worth_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalAssets: decimal("total_assets", { precision: 10, scale: 2 }).notNull(),
  totalLiabilities: decimal("total_liabilities", { precision: 10, scale: 2 }).notNull(),
  netWorth: decimal("net_worth", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export types
// Remove duplicate Asset exports - they exist later in file

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Envelope = typeof envelopes.$inferSelect;
export type InsertEnvelope = z.infer<typeof insertEnvelopeSchema>;

export type EnvelopeCategory = typeof envelopeCategories.$inferSelect;
export type InsertEnvelopeCategory = z.infer<typeof insertEnvelopeCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TransactionEnvelope = typeof transactionEnvelopes.$inferSelect;

export type CategoryRule = typeof categoryRules.$inferSelect;
export type InsertCategoryRule = z.infer<typeof insertCategoryRuleSchema>;

export type MerchantMemory = typeof merchantMemory.$inferSelect;
export type InsertMerchantMemory = z.infer<typeof insertMerchantMemorySchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type Liability = typeof liabilities.$inferSelect;
export type InsertLiability = z.infer<typeof insertLiabilitySchema>;

export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type InsertNetWorthSnapshot = z.infer<typeof insertNetWorthSnapshotSchema>;

// Add missing InsertLabel export
export type Label = typeof labels.$inferSelect;
export type InsertLabel = z.infer<typeof insertLabelSchema>;

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;

export type RecurringTransactionSplit = typeof recurringTransactionSplits.$inferSelect;
export type InsertRecurringTransactionSplit = z.infer<typeof insertRecurringTransactionSplitSchema>;

// Bank connections for Akahu integration
export const bankConnections = pgTable("bank_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankId: text("bank_id").notNull(), // Akahu bank identifier
  bankName: text("bank_name").notNull(),
  connectionId: text("connection_id").notNull(), // Akahu connection ID
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  consentExpiry: timestamp("consent_expiry"),
  lastSync: timestamp("last_sync"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBankConnectionSchema = createInsertSchema(bankConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BankConnection = typeof bankConnections.$inferSelect;
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;



export const insertEnvelopeTypeSchema = createInsertSchema(envelopeTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EnvelopeType = typeof envelopeTypes.$inferSelect;
export type InsertEnvelopeType = z.infer<typeof insertEnvelopeTypeSchema>;

// Insert schemas for net worth (defined after tables)
export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLiabilitySchema = createInsertSchema(liabilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNetWorthSnapshotSchema = createInsertSchema(netWorthSnapshots).omit({
  id: true,
  createdAt: true,
});
