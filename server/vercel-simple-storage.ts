// Simplified storage for Vercel deployment - fixes TypeScript compilation errors
import type { User, Account, Envelope, Transaction } from '@shared/schema';
import jwt from 'jsonwebtoken';

// Demo data storage
const demoUsers = new Map([
  ['1', {
    id: 1,
    username: 'demo',
    password: null,
    payCycle: 'fortnightly',
    payCycleStartDate: null,
    budgetName: 'My Budget Mate',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    phoneNumber: null,
    emailVerified: false,
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    profileImageUrl: null,
    replitId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User]
]);

const demoAccounts = new Map<number, Account>();
const demoEnvelopes = new Map<number, Envelope>();
const demoTransactions = new Map<number, Transaction>();
let nextId = 1000;

// Simple storage interface
export const vercelStorage = {
  async getUser(id: string): Promise<User | undefined> {
    return demoUsers.get(id);
  },

  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return Array.from(demoAccounts.values()).filter(a => a.userId === parseInt(userId));
  },

  async getEnvelopesByUserId(userId: string): Promise<Envelope[]> {
    return Array.from(demoEnvelopes.values()).filter(e => e.userId === parseInt(userId));
  },

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return Array.from(demoTransactions.values()).filter(t => t.userId === parseInt(userId));
  },

  async createAccount(data: any): Promise<Account> {
    const account = { 
      id: nextId++, 
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data 
    } as Account;
    demoAccounts.set(account.id, account);
    return account;
  },

  async createEnvelope(data: any): Promise<Envelope> {
    const envelope = { 
      id: nextId++, 
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data 
    } as Envelope;
    demoEnvelopes.set(envelope.id, envelope);
    return envelope;
  },

  async createTransaction(data: any): Promise<Transaction> {
    const transaction = { 
      id: nextId++, 
      ...data 
    } as Transaction;
    demoTransactions.set(transaction.id, transaction);
    return transaction;
  },

  async updateAccount(id: number, data: any): Promise<Account> {
    const existing = demoAccounts.get(id);
    if (!existing) throw new Error('Account not found');
    const updated = { ...existing, ...data, updatedAt: new Date() };
    demoAccounts.set(id, updated);
    return updated;
  },

  async updateEnvelope(id: number, data: any): Promise<Envelope> {
    const existing = demoEnvelopes.get(id);
    if (!existing) throw new Error('Envelope not found');
    const updated = { ...existing, ...data, updatedAt: new Date() };
    demoEnvelopes.set(id, updated);
    return updated;
  },

  async updateTransaction(id: number, data: any): Promise<Transaction> {
    const existing = demoTransactions.get(id);
    if (!existing) throw new Error('Transaction not found');
    const updated = { ...existing, ...data };
    demoTransactions.set(id, updated);
    return updated;
  },

  async deleteAccount(id: number): Promise<void> {
    demoAccounts.delete(id);
  },

  async deleteEnvelope(id: number): Promise<void> {
    demoEnvelopes.delete(id);
  },

  async deleteTransaction(id: number): Promise<void> {
    demoTransactions.delete(id);
  }
};

// Auth helper for Vercel serverless functions
export async function withAuth<T>(
  handler: (userId: string) => Promise<T>,
  req: any,
  res: any
): Promise<T | void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  try {
    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return await handler(decoded.userId);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
}