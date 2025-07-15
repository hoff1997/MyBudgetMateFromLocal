import {
  users,
  accounts,
  envelopes,
  transactions,
  transactionEnvelopes,
  type User,
  type UpsertUser,
  type Account,
  type InsertAccount,
  type Envelope,
  type InsertEnvelope,
  type Transaction,
  type InsertTransaction,
  type TransactionEnvelope,
  type EnvelopeCategory,
  type InsertEnvelopeCategory,
  type CategoryRule,
  type InsertCategoryRule,
  type MerchantMemory,
  type InsertMerchantMemory,
  type Asset,
  type InsertAsset,
  type Liability,
  type InsertLiability,
  type NetWorthSnapshot,
  type InsertNetWorthSnapshot,
  type Label,
  type InsertLabel,
  type TransactionLabel,
  type InsertTransactionLabel,
  type RecurringTransaction,
  type InsertRecurringTransaction,
  type RecurringTransactionSplit,
  type InsertRecurringTransactionSplit,
  type BankConnection,
  type InsertBankConnection,
  type EnvelopeType,
  type InsertEnvelopeType,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Account operations
  getAccountsByUserId(userId: number): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, updates: Partial<Account>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;
  
  // Envelope operations
  getEnvelopesByUserId(userId: number): Promise<Envelope[]>;
  createEnvelope(envelope: InsertEnvelope): Promise<Envelope>;
  updateEnvelope(id: number, updates: Partial<Envelope>): Promise<Envelope>;
  deleteEnvelope(id: number): Promise<void>;
  
  // Transaction operations
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  
  // Transaction envelope operations
  getTransactionEnvelopesByTransactionId(transactionId: number): Promise<TransactionEnvelope[]>;
  createTransactionEnvelope(transactionEnvelope: Omit<TransactionEnvelope, 'id'>): Promise<TransactionEnvelope>;
  deleteTransactionEnvelopes(transactionId: number): Promise<void>;
  
  // Additional operations
  getEnvelopeCategoriesByUserId(userId: number): Promise<EnvelopeCategory[]>;
  createEnvelopeCategory(category: InsertEnvelopeCategory): Promise<EnvelopeCategory>;
  updateEnvelopeCategory(id: number, updates: Partial<EnvelopeCategory>): Promise<EnvelopeCategory>;
  deleteEnvelopeCategory(id: number): Promise<void>;
  
  getCategoryRulesByUserId(userId: number): Promise<CategoryRule[]>;
  createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule>;
  updateCategoryRule(id: number, updates: Partial<CategoryRule>): Promise<CategoryRule>;
  deleteCategoryRule(id: number): Promise<void>;
  
  getMerchantMemoryByUserId(userId: number): Promise<MerchantMemory[]>;
  createMerchantMemory(memory: InsertMerchantMemory): Promise<MerchantMemory>;
  updateMerchantMemory(id: number, updates: Partial<MerchantMemory>): Promise<MerchantMemory>;
  deleteMerchantMemory(id: number): Promise<void>;
  
  getAssetsByUserId(userId: number): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;
  
  getLiabilitiesByUserId(userId: number): Promise<Liability[]>;
  createLiability(liability: InsertLiability): Promise<Liability>;
  updateLiability(id: number, updates: Partial<Liability>): Promise<Liability>;
  deleteLiability(id: number): Promise<void>;
  
  getNetWorthSnapshotsByUserId(userId: number): Promise<NetWorthSnapshot[]>;
  createNetWorthSnapshot(snapshot: InsertNetWorthSnapshot): Promise<NetWorthSnapshot>;
  deleteNetWorthSnapshot(id: number): Promise<void>;
  
  getLabelsByUserId(userId: number): Promise<Label[]>;
  createLabel(label: InsertLabel): Promise<Label>;
  updateLabel(id: number, updates: Partial<Label>): Promise<Label>;
  deleteLabel(id: number): Promise<void>;
  
  getTransactionLabelsByTransactionId(transactionId: number): Promise<TransactionLabel[]>;
  createTransactionLabel(transactionLabel: InsertTransactionLabel): Promise<TransactionLabel>;
  deleteTransactionLabel(id: number): Promise<void>;
  
  getRecurringTransactionsByUserId(userId: number): Promise<RecurringTransaction[]>;
  createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: number, updates: Partial<RecurringTransaction>): Promise<RecurringTransaction>;
  deleteRecurringTransaction(id: number): Promise<void>;
  
  getRecurringTransactionSplitsByTransactionId(transactionId: number): Promise<RecurringTransactionSplit[]>;
  createRecurringTransactionSplit(split: InsertRecurringTransactionSplit): Promise<RecurringTransactionSplit>;
  updateRecurringTransactionSplit(id: number, updates: Partial<RecurringTransactionSplit>): Promise<RecurringTransactionSplit>;
  deleteRecurringTransactionSplit(id: number): Promise<void>;
  
  getBankConnectionsByUserId(userId: number): Promise<BankConnection[]>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: number, updates: Partial<BankConnection>): Promise<BankConnection>;
  deleteBankConnection(id: number): Promise<void>;
  
  getEnvelopeTypesByUserId(userId: number): Promise<EnvelopeType[]>;
  createEnvelopeType(envelopeType: InsertEnvelopeType): Promise<EnvelopeType>;
  updateEnvelopeType(id: number, updates: Partial<EnvelopeType>): Promise<EnvelopeType>;
  deleteEnvelopeType(id: number): Promise<void>;
}

// In-memory storage implementation for development/demo
class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private accounts: Map<number, Account> = new Map();
  private envelopes: Map<number, Envelope> = new Map();
  private transactions: Map<number, Transaction> = new Map();
  private transactionEnvelopes: Map<number, TransactionEnvelope> = new Map();
  private envelopeCategories: Map<number, EnvelopeCategory> = new Map();
  private categoryRules: Map<number, CategoryRule> = new Map();
  private merchantMemory: Map<number, MerchantMemory> = new Map();
  private assets: Map<number, Asset> = new Map();
  private liabilities: Map<number, Liability> = new Map();
  private netWorthSnapshots: Map<number, NetWorthSnapshot> = new Map();
  private labels: Map<number, Label> = new Map();
  private transactionLabels: Map<number, TransactionLabel> = new Map();
  private recurringTransactions: Map<number, RecurringTransaction> = new Map();
  private recurringTransactionSplits: Map<number, RecurringTransactionSplit> = new Map();
  private bankConnections: Map<number, BankConnection> = new Map();
  private envelopeTypes: Map<number, EnvelopeType> = new Map();
  
  private nextId = 1;

  constructor() {
    this.initializeDemo();
  }

  private initializeDemo() {
    // Create demo user
    const demoUser: User = {
      id: "1",
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      username: "demo",
      password: null,
      payCycle: "fortnightly",
      payCycleStartDate: null,
      budgetName: "Demo Budget",
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
      akahu_user_token: null,
      akahu_app_token: null,
      email_verified_at: null,
      emailVerified: false,
      replitId: "demo-user",
    };
    this.users.set("1", demoUser);

    // Create demo account
    const demoAccount: Account = {
      id: 1,
      name: "ASB Everyday Account",
      type: "checking",
      balance: "2534.67",
      isActive: true,
      userId: 1,
      bankConnectionId: null,
      externalAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.accounts.set(1, demoAccount);

    // Create demo envelopes
    const demoEnvelopes: Envelope[] = [
      {
        id: 1,
        name: "Groceries",
        budgetedAmount: "800.00",
        currentBalance: "534.67",
        icon: "🛒",
        userId: 1,
        isActive: true,
        categoryId: 1,
        isMonitored: true,
        budgetFrequency: "monthly",
        nextPaymentDue: new Date("2025-02-01"),
        isSpendingAccount: false,
        annualAmount: "9600.00",
        openingBalance: "0.00",
        targetAmount: null,
        notes: null,
        parentId: null,
        envelopeTypeId: 1,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: "Transport",
        budgetedAmount: "300.00",
        currentBalance: "245.80",
        icon: "🚗",
        userId: 1,
        isActive: true,
        categoryId: 1,
        isMonitored: false,
        budgetFrequency: "monthly",
        nextPaymentDue: new Date("2025-02-01"),
        isSpendingAccount: false,
        annualAmount: "3600.00",
        openingBalance: "0.00",
        targetAmount: null,
        notes: null,
        parentId: null,
        envelopeTypeId: 1,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    demoEnvelopes.forEach(envelope => this.envelopes.set(envelope.id, envelope));

    // Create demo transactions
    const demoTransactions: Transaction[] = [
      {
        id: 1,
        amount: "-45.67",
        merchant: "Countdown",
        description: "Weekly groceries",
        date: new Date("2025-01-05"),
        userId: 1,
        accountId: 1,
        isApproved: true,
        receiptUrl: null,
        bankReference: null,
        bankMemo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        amount: "-25.90",
        merchant: "BP Service Station",
        description: "Fuel",
        date: new Date("2025-01-06"),
        userId: 1,
        accountId: 1,
        isApproved: true,
        receiptUrl: null,
        bankReference: null,
        bankMemo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    demoTransactions.forEach(transaction => this.transactions.set(transaction.id, transaction));

    // Create demo transaction envelopes
    const demoTransactionEnvelopes: TransactionEnvelope[] = [
      { id: 1, transactionId: 1, envelopeId: 1, amount: "-45.67" },
      { id: 2, transactionId: 2, envelopeId: 2, amount: "-25.90" },
    ];
    demoTransactionEnvelopes.forEach(te => this.transactionEnvelopes.set(te.id, te));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    const user: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date(),
      createdAt: existingUser?.createdAt || new Date(),
    } as User;
    this.users.set(userData.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  // Account operations
  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.userId === userId);
  }

  async createAccount(accountData: InsertAccount): Promise<Account> {
    const account: Account = {
      id: this.nextId++,
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async updateAccount(id: number, updates: Partial<Account>): Promise<Account> {
    const existing = this.accounts.get(id);
    if (!existing) throw new Error("Account not found");
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.accounts.set(id, updated);
    return updated;
  }

  async deleteAccount(id: number): Promise<void> {
    this.accounts.delete(id);
  }

  // Envelope operations
  async getEnvelopesByUserId(userId: number): Promise<Envelope[]> {
    return Array.from(this.envelopes.values()).filter(envelope => envelope.userId === userId);
  }

  async createEnvelope(envelopeData: InsertEnvelope): Promise<Envelope> {
    const envelope: Envelope = {
      id: this.nextId++,
      ...envelopeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.envelopes.set(envelope.id, envelope);
    return envelope;
  }

  async updateEnvelope(id: number, updates: Partial<Envelope>): Promise<Envelope> {
    const existing = this.envelopes.get(id);
    if (!existing) throw new Error("Envelope not found");
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.envelopes.set(id, updated);
    return updated;
  }

  async deleteEnvelope(id: number): Promise<void> {
    this.envelopes.delete(id);
  }

  // Transaction operations
  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(transaction => transaction.userId === userId);
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.nextId++,
      ...transactionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction> {
    const existing = this.transactions.get(id);
    if (!existing) throw new Error("Transaction not found");
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: number): Promise<void> {
    this.transactions.delete(id);
  }

  // Transaction envelope operations
  async getTransactionEnvelopesByTransactionId(transactionId: number): Promise<TransactionEnvelope[]> {
    return Array.from(this.transactionEnvelopes.values()).filter(te => te.transactionId === transactionId);
  }

  async createTransactionEnvelope(data: Omit<TransactionEnvelope, 'id'>): Promise<TransactionEnvelope> {
    const transactionEnvelope: TransactionEnvelope = {
      id: this.nextId++,
      ...data,
    };
    this.transactionEnvelopes.set(transactionEnvelope.id, transactionEnvelope);
    return transactionEnvelope;
  }

  async deleteTransactionEnvelopes(transactionId: number): Promise<void> {
    const toDelete = Array.from(this.transactionEnvelopes.entries())
      .filter(([_, te]) => te.transactionId === transactionId)
      .map(([id, _]) => id);
    toDelete.forEach(id => this.transactionEnvelopes.delete(id));
  }

  // Envelope category operations
  async getEnvelopeCategoriesByUserId(userId: number): Promise<EnvelopeCategory[]> {
    return Array.from(this.envelopeCategories.values()).filter(cat => cat.userId === userId);
  }

  async createEnvelopeCategory(categoryData: InsertEnvelopeCategory): Promise<EnvelopeCategory> {
    const category: EnvelopeCategory = {
      id: this.nextId++,
      ...categoryData,
      createdAt: new Date(),
      sortOrder: categoryData.sortOrder || 0,
      color: categoryData.color || "#3B82F6",
      isCollapsed: categoryData.isCollapsed || false,
    };
    this.envelopeCategories.set(category.id, category);
    return category;
  }

  async updateEnvelopeCategory(id: number, updates: Partial<EnvelopeCategory>): Promise<EnvelopeCategory> {
    const existing = this.envelopeCategories.get(id);
    if (!existing) throw new Error("Envelope category not found");
    const updated = { ...existing, ...updates };
    this.envelopeCategories.set(id, updated);
    return updated;
  }

  async deleteEnvelopeCategory(id: number): Promise<void> {
    this.envelopeCategories.delete(id);
  }

  async getCategoryRulesByUserId(userId: number): Promise<CategoryRule[]> { return []; }
  async createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule> { throw new Error("Not implemented"); }
  async updateCategoryRule(id: number, updates: Partial<CategoryRule>): Promise<CategoryRule> { throw new Error("Not implemented"); }
  async deleteCategoryRule(id: number): Promise<void> {}

  async getMerchantMemoryByUserId(userId: number): Promise<MerchantMemory[]> { return []; }
  async createMerchantMemory(memory: InsertMerchantMemory): Promise<MerchantMemory> { throw new Error("Not implemented"); }
  async updateMerchantMemory(id: number, updates: Partial<MerchantMemory>): Promise<MerchantMemory> { throw new Error("Not implemented"); }
  async deleteMerchantMemory(id: number): Promise<void> {}

  async getAssetsByUserId(userId: number): Promise<Asset[]> { return []; }
  async createAsset(asset: InsertAsset): Promise<Asset> { throw new Error("Not implemented"); }
  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> { throw new Error("Not implemented"); }
  async deleteAsset(id: number): Promise<void> {}

  async getLiabilitiesByUserId(userId: number): Promise<Liability[]> { return []; }
  async createLiability(liability: InsertLiability): Promise<Liability> { throw new Error("Not implemented"); }
  async updateLiability(id: number, updates: Partial<Liability>): Promise<Liability> { throw new Error("Not implemented"); }
  async deleteLiability(id: number): Promise<void> {}

  async getNetWorthSnapshotsByUserId(userId: number): Promise<NetWorthSnapshot[]> { return []; }
  async createNetWorthSnapshot(snapshot: InsertNetWorthSnapshot): Promise<NetWorthSnapshot> { throw new Error("Not implemented"); }
  async deleteNetWorthSnapshot(id: number): Promise<void> {}

  async getLabelsByUserId(userId: number): Promise<Label[]> { return []; }
  async createLabel(label: InsertLabel): Promise<Label> { throw new Error("Not implemented"); }
  async updateLabel(id: number, updates: Partial<Label>): Promise<Label> { throw new Error("Not implemented"); }
  async deleteLabel(id: number): Promise<void> {}

  async getTransactionLabelsByTransactionId(transactionId: number): Promise<TransactionLabel[]> { return []; }
  async createTransactionLabel(transactionLabel: InsertTransactionLabel): Promise<TransactionLabel> { throw new Error("Not implemented"); }
  async deleteTransactionLabel(id: number): Promise<void> {}

  async getRecurringTransactionsByUserId(userId: number): Promise<RecurringTransaction[]> { return []; }
  async createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction> { throw new Error("Not implemented"); }
  async updateRecurringTransaction(id: number, updates: Partial<RecurringTransaction>): Promise<RecurringTransaction> { throw new Error("Not implemented"); }
  async deleteRecurringTransaction(id: number): Promise<void> {}

  async getRecurringTransactionSplitsByTransactionId(transactionId: number): Promise<RecurringTransactionSplit[]> { return []; }
  async createRecurringTransactionSplit(split: InsertRecurringTransactionSplit): Promise<RecurringTransactionSplit> { throw new Error("Not implemented"); }
  async updateRecurringTransactionSplit(id: number, updates: Partial<RecurringTransactionSplit>): Promise<RecurringTransactionSplit> { throw new Error("Not implemented"); }
  async deleteRecurringTransactionSplit(id: number): Promise<void> {}

  async getBankConnectionsByUserId(userId: number): Promise<BankConnection[]> { return []; }
  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> { throw new Error("Not implemented"); }
  async updateBankConnection(id: number, updates: Partial<BankConnection>): Promise<BankConnection> { throw new Error("Not implemented"); }
  async deleteBankConnection(id: number): Promise<void> {}

  async getEnvelopeTypesByUserId(userId: number): Promise<EnvelopeType[]> { return []; }
  async createEnvelopeType(envelopeType: InsertEnvelopeType): Promise<EnvelopeType> { throw new Error("Not implemented"); }
  async updateEnvelopeType(id: number, updates: Partial<EnvelopeType>): Promise<EnvelopeType> { throw new Error("Not implemented"); }
  async deleteEnvelopeType(id: number): Promise<void> {}
}

export const storage = new MemStorage();