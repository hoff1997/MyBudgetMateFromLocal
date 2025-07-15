import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertEnvelopeSchema, insertAccountSchema, insertEnvelopeTypeSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure multer for CSV uploads
const csvUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for CSV files
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Simple health check route
  app.get('/api/ping', (req, res) => {
    res.json({ 
      status: 'success', 
      message: 'My Budget Mate API is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Setup authentication - try Supabase first, fallback to Replit, or disable for local dev
  const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
  const hasReplitAuth = process.env.REPLIT_DOMAINS && process.env.REPLIT_DOMAINS.trim() !== '';
  
  console.log('🔧 Authentication detection:');
  console.log('  - SUPABASE_URL:', !!process.env.SUPABASE_URL);
  console.log('  - SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);
  console.log('  - REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS || 'undefined');
  console.log('  - useSupabase:', useSupabase);
  console.log('  - hasReplitAuth:', hasReplitAuth);
  
  let authMiddleware;
  
  if (useSupabase) {
    console.log('Setting up Supabase authentication...');
    // Supabase auth is handled on the frontend via the config endpoint
    authMiddleware = (req: any, res: any, next: any) => {
      // For Supabase, we'll handle auth via JWT or session tokens
      // For now, using development mode
      req.user = { 
        id: '1', 
        claims: { sub: '1' }, 
        email: 'dev@localhost'
      };
      next();
    };
  } else if (hasReplitAuth) {
    console.log('Supabase not configured, using Replit authentication...');
    await setupAuth(app);
    authMiddleware = isAuthenticated;
  } else {
    console.log('🔧 Running in local development mode - authentication disabled for testing');
    // No-op middleware for local development
    authMiddleware = (req: any, res: any, next: any) => {
      // Mock user for local development
      req.user = { 
        id: '1', 
        claims: { sub: '1' }, 
        email: 'dev@localhost'
      };
      next();
    };
  }

  // Configuration endpoint for frontend
  app.get('/api/config', (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
      hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
    });
  });

  // Auth routes
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    try {
      let userId;
      if (useSupabase) {
        userId = req.user.id;
      } else if (hasReplitAuth) {
        userId = req.user.claims.sub;
      } else {
        // Local development - use mock user
        userId = '1';
      }
      
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all envelopes
  app.get('/api/envelopes', authMiddleware, async (req: any, res) => {
    try {
      let userId;
      if (useSupabase) {
        userId = req.user.id;
      } else if (hasReplitAuth) {
        userId = req.user.claims.sub;
      } else {
        // Local development - use mock user
        userId = '1';
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const envelopes = await storage.getEnvelopesByUserId(user.id);
      res.json(envelopes);
    } catch (error) {
      console.error("Error fetching envelopes:", error);
      res.status(500).json({ message: "Failed to fetch envelopes" });
    }
  });

  // Get single envelope
  app.get("/api/envelopes/:id", async (req, res) => {
    const envelope = await storage.getEnvelope(parseInt(req.params.id));
    if (!envelope) {
      return res.status(404).json({ error: "Envelope not found" });
    }
    res.json(envelope);
  });

  // Update envelope
  app.patch("/api/envelopes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const envelope = await storage.getEnvelope(id);
      if (!envelope) {
        return res.status(404).json({ error: "Envelope not found" });
      }
      
      // Debug logging
      console.log(`Updating envelope ${id} (${envelope.name}) with:`, req.body);
      
      // Handle opening balance changes - adjust current balance accordingly
      if (req.body.openingBalance !== undefined) {
        const oldOpeningBalance = parseFloat(envelope.openingBalance || "0");
        const newOpeningBalance = parseFloat(req.body.openingBalance || "0");
        
        // Only adjust if the opening balance is actually changing
        if (oldOpeningBalance !== newOpeningBalance) {
          const currentBalance = parseFloat(envelope.currentBalance || "0");
          
          // Adjust current balance by the difference in opening balance
          const balanceDifference = newOpeningBalance - oldOpeningBalance;
          const newCurrentBalance = currentBalance + balanceDifference;
          
          // Include the adjusted current balance in the update
          req.body.currentBalance = newCurrentBalance.toFixed(2);
        }
      }
      
      await storage.updateEnvelope(id, req.body);
      const updatedEnvelope = await storage.getEnvelope(id);
      console.log(`After update, envelope budgetFrequency is:`, updatedEnvelope?.budgetFrequency);
      res.json(updatedEnvelope);
    } catch (error) {
      console.error("Update envelope error:", error);
      res.status(500).json({ error: "Failed to update envelope" });
    }
  });

  // Delete envelope (with safety checks)
  app.delete("/api/envelopes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const envelope = await storage.getEnvelope(id);
      
      if (!envelope) {
        return res.status(404).json({ error: "Envelope not found" });
      }
      
      // Safety check: envelope must have zero balance
      const balance = parseFloat(envelope.currentBalance);
      if (balance !== 0) {
        return res.status(400).json({ 
          error: "Cannot delete envelope with non-zero balance",
          message: `Envelope has a balance of $${balance.toFixed(2)}. Please transfer all funds to another envelope first.`
        });
      }
      
      // Additional safety check: ensure no transactions are assigned to this envelope
      const transactions = await storage.getTransactionsByUserId(envelope.userId);
      const hasTransactions = transactions.some(t => 
        t.transactionEnvelopes && t.transactionEnvelopes.some((te: any) => te.envelopeId === id)
      );
      
      if (hasTransactions) {
        return res.status(400).json({
          error: "Cannot delete envelope with transaction history",
          message: "This envelope has transactions assigned to it. Please reassign transactions before deletion."
        });
      }
      
      await storage.deleteEnvelope(id);
      res.json({ message: "Envelope deleted successfully" });
    } catch (error) {
      console.error("Delete envelope error:", error);
      res.status(500).json({ error: "Failed to delete envelope" });
    }
  });

  // Get all merchant memory for user
  app.get("/api/merchant-memory", async (req, res) => {
    try {
      const merchantMemory = await storage.getMerchantMemoryByUserId(1);
      res.json(merchantMemory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch merchant memory" });
    }
  });

  // Get merchant suggestions
  app.get("/api/merchants/suggest/:merchant", async (req, res) => {
    try {
      const merchant = decodeURIComponent(req.params.merchant);
      const suggestion = await storage.getMerchantSuggestion(1, merchant);
      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ message: "Failed to get merchant suggestion" });
    }
  });

  // Get category rules
  app.get("/api/category-rules", async (req, res) => {
    try {
      const rules = await storage.getCategoryRulesByUserId(1);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category rules" });
    }
  });

  // Create category rule
  app.post("/api/category-rules", async (req, res) => {
    try {
      const ruleData = {
        userId: 1,
        pattern: req.body.pattern,
        envelopeId: req.body.envelopeId,
        isActive: true,
      };
      const rule = await storage.createCategoryRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid rule data" });
    }
  });

  // Delete category rule
  app.delete("/api/category-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategoryRule(id);
      res.json({ message: "Rule deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rule" });
    }
  });

  // Create envelope transfer (between two envelopes)
  app.post("/api/envelopes/transfer", async (req, res) => {
    try {
      const { fromEnvelopeId, toEnvelopeId, amount, description } = req.body;
      
      const fromEnvelope = await storage.getEnvelope(fromEnvelopeId);
      const toEnvelope = await storage.getEnvelope(toEnvelopeId);
      
      if (!fromEnvelope || !toEnvelope) {
        return res.status(404).json({ message: "Envelope not found" });
      }
      
      const transferAmount = parseFloat(amount);
      
      // Update balances
      const fromBalance = parseFloat(fromEnvelope.currentBalance) - transferAmount;
      const toBalance = parseFloat(toEnvelope.currentBalance) + transferAmount;
      
      await storage.updateEnvelopeBalance(fromEnvelopeId, fromBalance.toFixed(2));
      await storage.updateEnvelopeBalance(toEnvelopeId, toBalance.toFixed(2));
      
      res.json({ 
        message: "Transfer completed",
        from: fromEnvelope.name,
        to: toEnvelope.name,
        amount: transferAmount.toFixed(2)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process transfer" });
    }
  });

  // Create envelope transfer (legacy single envelope update)
  app.post("/api/envelope-transfers", async (req, res) => {
    try {
      const { envelopeId, amount, description } = req.body;
      
      // Update envelope balance directly
      const envelope = await storage.getEnvelope(envelopeId);
      if (!envelope) {
        return res.status(404).json({ message: "Envelope not found" });
      }
      
      const currentBalance = parseFloat(envelope.currentBalance);
      const newBalance = currentBalance + parseFloat(amount);
      
      await storage.updateEnvelopeBalance(envelopeId, newBalance.toFixed(2));
      
      res.json({ 
        message: "Transfer completed",
        envelope: envelope.name,
        amount: amount,
        newBalance: newBalance.toFixed(2)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process transfer" });
    }
  });

  // Get recurring transactions
  app.get("/api/recurring-transactions", async (req, res) => {
    try {
      const userId = 1; // Demo user
      const recurringTransactions = await storage.getRecurringTransactionsByUserId(userId);
      
      // Get splits for each recurring transaction
      const transactionsWithSplits = await Promise.all(
        recurringTransactions.map(async (transaction) => {
          const splits = await storage.getRecurringTransactionSplits(transaction.id);
          return { ...transaction, splits };
        })
      );
      
      res.json(transactionsWithSplits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recurring transactions" });
    }
  });

  // Create recurring transaction
  app.post("/api/recurring-transactions", async (req, res) => {
    try {
      const { name, amount, frequency, nextDate, accountId, surplusEnvelopeId, splits } = req.body;
      
      // Create the recurring transaction
      const recurringTransaction = await storage.createRecurringTransaction({
        userId: 1, // Demo user
        name,
        amount,
        frequency,
        nextDate: new Date(nextDate),
        accountId,
        isActive: true,
        surplusEnvelopeId,
      });
      
      // Create the splits
      if (splits && splits.length > 0) {
        await Promise.all(
          splits.map((split: any, index: number) =>
            storage.createRecurringTransactionSplit({
              recurringTransactionId: recurringTransaction.id,
              envelopeId: split.envelopeId,
              amount: split.amount,
              percentage: split.percentage || null,
              priority: index + 1,
            })
          )
        );
      }
      
      res.json(recurringTransaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create recurring transaction" });
    }
  });

  // Create recurring transaction
  app.post("/api/recurring-transactions", async (req, res) => {
    try {
      const recurringTransaction = await storage.createRecurringTransaction(req.body);
      res.status(201).json(recurringTransaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create recurring transaction" });
    }
  });

  // Create recurring transaction split
  app.post("/api/recurring-transaction-splits", async (req, res) => {
    try {
      const split = await storage.createRecurringTransactionSplit(req.body);
      res.status(201).json(split);
    } catch (error) {
      res.status(500).json({ message: "Failed to create recurring transaction split" });
    }
  });

  // Process recurring transaction (manual trigger or scheduled)
  app.post("/api/recurring-transactions/:id/process", async (req, res) => {
    try {
      const recurringTransactionId = parseInt(req.params.id);
      const { actualAmount } = req.body; // Actual amount received (may be different from expected)
      
      const recurringTransaction = await storage.getRecurringTransaction(recurringTransactionId);
      if (!recurringTransaction) {
        return res.status(404).json({ message: "Recurring transaction not found" });
      }
      
      const splits = await storage.getRecurringTransactionSplits(recurringTransactionId);
      const receivedAmount = parseFloat(actualAmount || recurringTransaction.amount);
      
      // Calculate total allocated amount
      const totalAllocated = splits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
      const surplus = receivedAmount - totalAllocated;
      
      // Create income transaction
      const incomeTransaction = await storage.createTransaction({
        userId: 1, // Demo user
        accountId: recurringTransaction.accountId,
        amount: receivedAmount.toFixed(2),
        merchant: recurringTransaction.name,
        description: `Recurring income: ${recurringTransaction.name}`,
        date: new Date(),
        type: "income",
      });
      
      // Process each split
      for (const split of splits) {
        const splitAmount = parseFloat(split.amount);
        if (splitAmount > 0) {
          // Update envelope balance
          const envelope = await storage.getEnvelope(split.envelopeId);
          if (envelope) {
            const newBalance = parseFloat(envelope.currentBalance) + splitAmount;
            await storage.updateEnvelopeBalance(split.envelopeId, newBalance.toFixed(2));
            
            // Create transaction envelope record
            await storage.createTransactionEnvelope(incomeTransaction.id, split.envelopeId, splitAmount.toFixed(2));
          }
        }
      }
      
      // Handle surplus
      if (surplus > 0 && recurringTransaction.surplusEnvelopeId) {
        const surplusEnvelope = await storage.getEnvelope(recurringTransaction.surplusEnvelopeId);
        if (surplusEnvelope) {
          const newBalance = parseFloat(surplusEnvelope.currentBalance) + surplus;
          await storage.updateEnvelopeBalance(recurringTransaction.surplusEnvelopeId, newBalance.toFixed(2));
          
          // Create transaction envelope record for surplus
          await storage.createTransactionEnvelope(incomeTransaction.id, recurringTransaction.surplusEnvelopeId, surplus.toFixed(2));
        }
      }
      
      // Update next date based on frequency
      let nextDate = new Date(recurringTransaction.nextDate);
      switch (recurringTransaction.frequency) {
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "fortnightly":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      
      await storage.updateRecurringTransaction(recurringTransactionId, { nextDate });
      
      res.json({ 
        message: "Recurring transaction processed",
        transactionId: incomeTransaction.id,
        totalAllocated: totalAllocated.toFixed(2),
        surplus: surplus.toFixed(2),
        nextDate 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process recurring transaction" });
    }
  });

  // Delete recurring transaction
  app.delete("/api/recurring-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRecurringTransaction(id);
      res.json({ message: "Recurring transaction deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recurring transaction" });
    }
  });

  // Bank Connections API
  app.get("/api/bank-connections", async (req, res) => {
    try {
      const connections = await storage.getBankConnectionsByUserId(1);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bank connections" });
    }
  });

  app.post("/api/bank-connections/connect", async (req, res) => {
    try {
      const { bankId } = req.body;
      
      // In production, this would initiate Akahu OAuth flow
      // For demo, we'll create a mock connection
      const bankNames: Record<string, string> = {
        'anz': 'ANZ New Zealand',
        'asb': 'ASB Bank',
        'bnz': 'Bank of New Zealand',
        'westpac': 'Westpac New Zealand',
        'kiwibank': 'Kiwibank',
        'heartland': 'Heartland Bank',
        'tsbbank': 'TSB Bank'
      };
      
      const connection = await storage.createBankConnection({
        userId: 1,
        bankId,
        bankName: bankNames[bankId] || 'Unknown Bank',
        connectionId: `demo-${bankId}-${Date.now()}`,
        accessToken: `demo_token_${Date.now()}`,
        refreshToken: `demo_refresh_${Date.now()}`,
        consentExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        lastSync: new Date(),
        isActive: true
      });
      
      res.json({ 
        message: "Bank connected successfully",
        connection,
        // In production, this would be the Akahu OAuth URL
        redirectUrl: `https://oauth.akahu.io/authorize?client_id=demo&connection_id=${connection.connectionId}`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to connect bank" });
    }
  });

  app.post("/api/bank-connections/:id/sync", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const connection = await storage.getBankConnection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: "Bank connection not found" });
      }
      
      // In production, this would call Akahu API to fetch transactions
      // For demo, simulate some bank transactions with duplicate detection
      const { processBankTransaction, updateExistingTransactionsWithHashes } = await import('./duplicateDetection');
      
      // First, ensure existing transactions have hashes for matching
      await updateExistingTransactionsWithHashes(connection.userId);
      
      // Simulate bank transactions that might match existing manual entries
      const mockBankTransactions = [
        {
          amount: "45.50",
          date: "2024-12-21", // Recent date that might match manual entries
          merchant: "New World Auckland Central",
          description: "EFTPOS Purchase",
          bankTransactionId: `bank_${Date.now()}_1`
        },
        {
          amount: "120.00",
          date: "2024-12-20",
          merchant: "Genesis Energy Online",
          description: "Direct Debit",
          bankTransactionId: `bank_${Date.now()}_2`
        }
      ];
      
      let newTransactions = 0;
      let mergedTransactions = 0;
      let flaggedTransactions = 0;
      const results = [];
      
      // Get account for this bank connection (demo: use first account)
      const accounts = await storage.getAccountsByUserId(connection.userId);
      const account = accounts[0];
      
      if (account) {
        for (const bankTx of mockBankTransactions) {
          const result = await processBankTransaction(bankTx, connection.userId, account.id);
          results.push(result);
          
          switch (result.action) {
            case 'created':
              newTransactions++;
              break;
            case 'merged':
              mergedTransactions++;
              break;
            case 'flagged':
              flaggedTransactions++;
              break;
          }
        }
      }
      
      await storage.updateBankConnection(connectionId, { 
        lastSync: new Date() 
      });
      
      res.json({ 
        message: "Sync completed with duplicate detection",
        transactionCount: newTransactions,
        mergedCount: mergedTransactions,
        flaggedCount: flaggedTransactions,
        lastSync: new Date(),
        details: results.map(r => r.message)
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ message: "Failed to sync bank data" });
    }
  });

  app.delete("/api/bank-connections/:id", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      await storage.deleteBankConnection(connectionId);
      res.json({ message: "Bank connection deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bank connection" });
    }
  });

  // Resolve duplicate transactions
  app.post("/api/transactions/resolve-duplicate", async (req, res) => {
    try {
      const { bankTransactionId, manualTransactionId, action } = req.body;
      
      const bankTx = await storage.getTransaction(bankTransactionId);
      const manualTx = await storage.getTransaction(manualTransactionId);
      
      if (!bankTx || !manualTx) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      switch (action) {
        case 'merge':
          // Update manual transaction with bank info and approve
          await storage.updateTransaction(manualTransactionId, {
            bankTransactionId: bankTx.bankTransactionId,
            isApproved: true,
            duplicateStatus: 'confirmed'
          });
          // Delete the bank transaction
          await storage.deleteTransaction(bankTransactionId);
          break;
          
        case 'keep_both':
          // Mark both as reviewed but separate
          await storage.updateTransaction(bankTransactionId, {
            duplicateStatus: 'reviewed'
          });
          await storage.updateTransaction(manualTransactionId, {
            duplicateStatus: 'reviewed'
          });
          break;
          
        case 'delete_bank':
          // Just delete the bank transaction
          await storage.deleteTransaction(bankTransactionId);
          break;
      }
      
      res.json({ message: "Duplicate resolved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve duplicate" });
    }
  });

  // Get potential duplicates for review
  app.get("/api/transactions/duplicates", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUserId(1);
      const potentialDuplicates = transactions.filter(tx => 
        tx.duplicateStatus === 'potential' && tx.duplicateOfId
      );
      
      // Get the related transactions for context
      const duplicatesWithContext = await Promise.all(
        potentialDuplicates.map(async (tx) => {
          const relatedTx = await storage.getTransaction(tx.duplicateOfId!);
          return {
            transaction: tx,
            potentialDuplicate: relatedTx
          };
        })
      );
      
      res.json(duplicatesWithContext);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch duplicates" });
    }
  });
  // Get current user (demo user for now)
  app.get("/api/user", async (req, res) => {
    const user = await storage.getUser(1); // Demo user
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });

  // Update user settings
  app.patch("/api/user/settings", async (req, res) => {
    try {
      const userId = 1; // Demo user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with new settings
      const updatedUser = { ...user, ...req.body };
      await storage.updateUser(userId, updatedUser);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user settings error:", error);
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });

  // Get user accounts
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccountsByUserId(1);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // Create account
  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = insertAccountSchema.parse({...req.body, userId: 1});
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ message: "Invalid account data" });
    }
  });

  // Get user envelopes
  app.get("/api/envelopes", async (req, res) => {
    try {
      const envelopes = await storage.getEnvelopesByUserId(1);
      res.json(envelopes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch envelopes" });
    }
  });

  // Get envelope categories
  app.get("/api/envelope-categories", async (req, res) => {
    try {
      const categories = await storage.getEnvelopeCategoriesByUserId(1);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching envelope categories:', error);
      res.status(500).json({ message: "Failed to fetch envelope categories" });
    }
  });

  // Create envelope category
  app.post("/api/envelope-categories", async (req, res) => {
    try {
      const categoryData = {
        ...req.body,
        userId: 1, // Demo user
        sortOrder: req.body.sortOrder || 0,
        isCollapsed: false,
        isActive: true,
      };
      const category = await storage.createEnvelopeCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error('Error creating envelope category:', error);
      res.status(500).json({ message: "Failed to create envelope category" });
    }
  });

  // Update envelope category
  app.patch("/api/envelope-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getEnvelopeCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      await storage.updateEnvelopeCategory(id, req.body);
      const updatedCategory = await storage.getEnvelopeCategory(id);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Update envelope category error:", error);
      res.status(500).json({ error: "Failed to update envelope category" });
    }
  });

  // Delete envelope category
  app.delete("/api/envelope-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getEnvelopeCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      // Check if any envelopes are using this category
      const envelopes = await storage.getEnvelopesByUserId(1);
      const hasEnvelopes = envelopes.some(envelope => envelope.categoryId === id);
      
      if (hasEnvelopes) {
        // Move envelopes to uncategorised (null categoryId)
        const promises = envelopes
          .filter(envelope => envelope.categoryId === id)
          .map(envelope => storage.updateEnvelope(envelope.id, { categoryId: null }));
        await Promise.all(promises);
      }
      
      await storage.deleteEnvelopeCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete envelope category error:", error);
      res.status(500).json({ error: "Failed to delete envelope category" });
    }
  });

  // Create envelope
  app.post("/api/envelopes", async (req, res) => {
    try {
      const envelopeData = {
        ...req.body,
        userId: 1,
        budgetedAmount: req.body.budgetedAmount || "0.00",
        currentBalance: req.body.currentBalance || "0.00",
        openingBalance: req.body.openingBalance || "0.00",
        annualAmount: req.body.annualAmount || "0.00",
        payCycleAmount: req.body.payCycleAmount || "0.00",
        envelopeType: req.body.envelopeType || "expense",
        notes: req.body.notes || "",
        budgetFrequency: req.body.budgetFrequency || "monthly",
        isActive: true
      };
      const envelope = await storage.createEnvelope(envelopeData);
      res.status(201).json(envelope);
    } catch (error) {
      console.error("Envelope creation error:", error);
      res.status(400).json({ message: "Invalid envelope data" });
    }
  });

  // Get approved transactions
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUserId(1);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get pending transactions
  app.get("/api/transactions/pending", async (req, res) => {
    try {
      const transactions = await storage.getPendingTransactionsByUserId(1);
      const transactionsWithEnvelopes = await Promise.all(
        transactions.map(async (transaction) => {
          const envelopes = await storage.getTransactionEnvelopes(transaction.id);
          return { ...transaction, envelopes };
        })
      );
      res.json(transactionsWithEnvelopes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  // Create transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId: 1,
        date: new Date(req.body.date || Date.now()),
      });
      const transaction = await storage.createTransaction(transactionData);

      // Save merchant memory if envelopes are provided
      if (transactionData.envelopes && transactionData.envelopes.length > 0) {
        await storage.upsertMerchantMemory({
          userId: 1,
          merchant: transactionData.merchant,
          lastEnvelopeId: transactionData.envelopes[0].envelopeId,
          frequency: 1,
          lastUsed: new Date(),
        });
      }

      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid transaction data" });
    }
  });

  // Delete transaction


  // Bulk delete transactions
  app.delete("/api/transactions", async (req, res) => {
    try {
      const { transactionIds } = req.body;
      
      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: "Invalid transaction IDs provided" });
      }

      // Delete all transactions
      for (const id of transactionIds) {
        await storage.deleteTransaction(parseInt(id));
      }

      res.json({ 
        message: `${transactionIds.length} transaction${transactionIds.length !== 1 ? 's' : ''} deleted successfully` 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk delete transactions" });
    }
  });

  // Get transaction envelopes
  app.get("/api/transactions/:id/envelopes", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const envelopes = await storage.getTransactionEnvelopes(transactionId);
      res.json(envelopes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction envelopes" });
    }
  });

  // Create transaction envelope assignment
  app.post("/api/transactions/:id/envelopes", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { envelopeId, amount } = req.body;
      
      await storage.createTransactionEnvelope(transactionId, envelopeId, amount);
      res.json({ message: "Transaction envelope created" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create transaction envelope" });
    }
  });

  // Delete transaction envelope assignments
  app.delete("/api/transactions/:id/envelopes", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      await storage.deleteTransactionEnvelopes(transactionId);
      res.json({ message: "Transaction envelopes cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear transaction envelopes" });
    }
  });

  // Update transaction (PATCH)
  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`PATCH /api/transactions/${id} - Request body:`, req.body);
      
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        console.log(`Transaction ${id} not found`);
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      // Update the transaction with provided fields
      console.log(`Updating transaction ${id} with:`, req.body);
      await storage.updateTransaction(id, req.body);
      
      // Return the updated transaction
      const updatedTransaction = await storage.getTransaction(id);
      console.log(`Updated transaction ${id} successfully`);
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Delete transaction
  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      await storage.deleteTransaction(id);
      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Approve transaction (corrected endpoint)
  app.post("/api/transactions/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { envelopes, description, labelIds } = req.body;
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Validate that envelope assignments are provided
      if (!envelopes || envelopes.length === 0) {
        return res.status(400).json({ 
          message: "Cannot approve transaction without envelope assignment" 
        });
      }
      
      // Validate that all envelopes have valid IDs
      const hasValidEnvelopes = envelopes.every((env: any) => {
        const envelopeId = parseInt(env.envelopeId);
        return envelopeId && envelopeId > 0;
      });
      if (!hasValidEnvelopes) {
        console.log("Invalid envelopes:", envelopes);
        return res.status(400).json({ 
          message: "All envelope assignments must have valid envelope IDs" 
        });
      }
      
      // Validate amounts match transaction total
      const totalEnvelopeAmount = envelopes.reduce((sum: number, env: any) => sum + Math.abs(parseFloat(env.amount || '0')), 0);
      const transactionAmount = Math.abs(parseFloat(transaction.amount));
      
      console.log("Validation:", { 
        totalEnvelopeAmount, 
        transactionAmount, 
        envelopes,
        difference: Math.abs(totalEnvelopeAmount - transactionAmount)
      });
      
      if (Math.abs(totalEnvelopeAmount - transactionAmount) > 0.01) {
        return res.status(400).json({ 
          message: `Envelope amounts (${totalEnvelopeAmount.toFixed(2)}) must equal transaction amount (${transactionAmount.toFixed(2)})` 
        });
      }
      
      // Clear existing envelope assignments and create new ones
      await storage.deleteTransactionEnvelopes(id);
      
      // Create new envelope assignments
      for (const envelope of envelopes) {
        await storage.createTransactionEnvelope(id, envelope.envelopeId, envelope.amount);
      }
      
      // Update description if provided
      if (description !== undefined) {
        await storage.updateTransaction(id, { description });
      }
      
      // Handle labels if provided
      if (labelIds && Array.isArray(labelIds)) {
        // Clear existing labels
        await storage.deleteAllTransactionLabels(id);
        
        // Add new labels
        for (const labelId of labelIds) {
          await storage.createTransactionLabel(id, labelId);
        }
      }
      
      // Approve the transaction
      await storage.approveTransaction(id);
      res.json({ message: "Transaction approved" });
    } catch (error) {
      console.error("Approval error:", error);
      res.status(500).json({ message: "Failed to approve transaction" });
    }
  });

  // Labels API
  app.get("/api/labels", async (req, res) => {
    try {
      const labels = await storage.getLabelsByUserId(1);
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  app.post("/api/labels", async (req, res) => {
    try {
      const { name, colour, color } = req.body;
      const label = await storage.createLabel({
        userId: 1,
        name,
        colour: colour || color || "#3b82f6"
      });
      res.json(label);
    } catch (error) {
      console.error("Failed to create label:", error);
      res.status(500).json({ message: "Failed to create label" });
    }
  });

  app.patch("/api/labels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const label = await storage.getLabel(id);
      
      if (!label) {
        return res.status(404).json({ error: "Label not found" });
      }
      
      await storage.updateLabel(id, req.body);
      const updatedLabel = await storage.getLabel(id);
      res.json(updatedLabel);
    } catch (error) {
      console.error("Update label error:", error);
      res.status(500).json({ error: "Failed to update label" });
    }
  });

  // Transaction Labels API
  app.get("/api/transactions/:id/labels", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const labels = await storage.getTransactionLabels(transactionId);
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction labels" });
    }
  });

  app.post("/api/transactions/:id/labels", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { labelId } = req.body;
      await storage.createTransactionLabel(transactionId, labelId);
      res.json({ message: "Transaction label created" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create transaction label" });
    }
  });

  app.delete("/api/transactions/:id/labels", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      await storage.deleteAllTransactionLabels(transactionId);
      res.json({ message: "Transaction labels cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear transaction labels" });
    }
  });

  // Upload receipt
  app.post("/api/upload-receipt", upload.single('receipt'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload receipt" });
    }
  });

  // Import transactions from CSV
  app.post("/api/transactions/import-csv", csvUpload.single('csv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const csvFilePath = req.file.path;
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      
      // Parse CSV content
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must contain at least a header and one data row" });
      }

      // Get account ID from request
      console.log('CSV Import Request Body:', req.body);
      const accountId = req.body.accountId ? parseInt(req.body.accountId) : null;
      console.log('Parsed Account ID:', accountId);
      if (!accountId) {
        return res.status(400).json({ message: "Account ID is required for importing transactions" });
      }

      // Verify the account exists and belongs to the user
      const account = await storage.getAccount(accountId);
      if (!account || account.userId !== 1) {
        return res.status(400).json({ message: "Invalid account or account not found" });
      }
      console.log('Using account:', account.name);

      // Detect CSV format and find header row
      let headerRowIndex = 0;
      let dataStartIndex = 1;
      
      // Look for the actual header row (contains "Date" and "Amount" columns)
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('date') && (line.includes('amount') || line.includes('payee'))) {
          headerRowIndex = i;
          dataStartIndex = i + 1;
          console.log(`Found header row at line ${i + 1}: ${lines[i]}`);
          break;
        }
      }
      
      // Skip empty lines after header
      while (dataStartIndex < lines.length && !lines[dataStartIndex].trim()) {
        dataStartIndex++;
      }

      const headerRow = lines[headerRowIndex];
      const dataRows = lines.slice(dataStartIndex);
      let importedCount = 0;
      const errors: string[] = [];

      console.log('CSV Lines:', lines.length);
      console.log('Header row index:', headerRowIndex);
      console.log('Data start index:', dataStartIndex);
      console.log('Data rows to process:', dataRows.length);
      
      // Proper CSV parsing function to handle embedded commas
      const parseCSVRow = (csvRow: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < csvRow.length; i++) {
          const char = csvRow[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      // Parse header to determine column mapping
      const headerColumns = parseCSVRow(headerRow).map(col => col.replace(/^"|"$/g, '').toLowerCase());
      console.log('Header columns:', headerColumns);
      
      // Map column indices for different CSV formats
      const columnMapping = {
        date: -1,
        merchant: -1,
        amount: -1,
        description: -1,
        uniqueId: -1,
        tranType: -1
      };
      
      // Find column indices
      headerColumns.forEach((col, index) => {
        if (col.includes('date')) columnMapping.date = index;
        if (col.includes('payee') || col.includes('merchant')) columnMapping.merchant = index;
        if (col.includes('amount')) columnMapping.amount = index;
        if (col.includes('memo') || col.includes('description') || col.includes('reference')) columnMapping.description = index;
        if (col.includes('unique id') || col.includes('unique_id') || col.includes('uniqueid')) columnMapping.uniqueId = index;
        if (col.includes('tran type') || col.includes('tran_type') || col.includes('trantype') || col.includes('transaction type')) columnMapping.tranType = index;
      });
      
      console.log('Column mapping:', columnMapping);
      
      for (let i = 0; i < dataRows.length; i++) {
        try {
          const row = parseCSVRow(dataRows[i]);
          console.log(`Row ${i + dataStartIndex + 1} parsed:`, row);
          
          if (row.length < 3) {
            errors.push(`Row ${i + dataStartIndex + 1}: Insufficient columns`);
            continue;
          }

          // Extract fields using column mapping
          const dateStr = columnMapping.date >= 0 ? row[columnMapping.date] : row[0];
          const merchant = columnMapping.merchant >= 0 ? row[columnMapping.merchant] : row[1];
          const amountStr = columnMapping.amount >= 0 ? row[columnMapping.amount] : row[2];
          const description = columnMapping.description >= 0 ? row[columnMapping.description] : (row[3] || '');
          const uniqueId = columnMapping.uniqueId >= 0 ? row[columnMapping.uniqueId] : null;
          const tranType = columnMapping.tranType >= 0 ? row[columnMapping.tranType] : null;
          
          console.log(`Processing: Date="${dateStr}", Merchant="${merchant}", Amount="${amountStr}", Description="${description}"`);

          // Validate required fields
          if (!dateStr || !merchant || !amountStr) {
            errors.push(`Row ${i + dataStartIndex + 1}: Missing required fields (date, merchant, or amount)`);
            continue;
          }

          // Parse date (support multiple formats)
          let date: Date;
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                // YYYY/MM/DD format (ASB bank export format)
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              } else {
                // DD/MM/YYYY format (NZ standard)
                date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              }
            } else {
              errors.push(`Row ${i + dataStartIndex + 1}: Invalid date format: ${dateStr}`);
              continue;
            }
          } else if (dateStr.includes('-')) {
            // YYYY-MM-DD format
            date = new Date(dateStr);
          } else {
            errors.push(`Row ${i + dataStartIndex + 1}: Invalid date format: ${dateStr}`);
            continue;
          }

          if (isNaN(date.getTime())) {
            errors.push(`Row ${i + dataStartIndex + 1}: Invalid date: ${dateStr}`);
            continue;
          }

          // Parse amount
          const amount = parseFloat(amountStr.replace(/[^-\d.]/g, ''));
          if (isNaN(amount)) {
            errors.push(`Row ${i + dataStartIndex + 1}: Invalid amount: ${amountStr}`);
            continue;
          }

          // Create transaction
          const transactionData = {
            userId: 1,
            merchant: merchant || 'Unknown Merchant',
            description: null, // Always blank on import - user fills from reconciliation page
            amount: amount.toString(),
            date,
            accountId: accountId,
            isApproved: false, // Imported transactions need approval
            isTransfer: false,
            transferToAccountId: null,
            receiptUrl: null,
            category: null,
            duplicateStatus: null,
            duplicateOfId: null,
            bankSyncId: null,
            bankHash: null,
            bankReference: uniqueId || null, // Store bank unique ID as reference
            bankMemo: description || null, // Store actual memo/description as memo
          };

          await storage.createTransaction(transactionData);
          importedCount++;

        } catch (error) {
          errors.push(`Row ${i + dataStartIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(csvFilePath);

      res.json({
        imported: importedCount,
        errors: errors,
        message: `Successfully imported ${importedCount} transactions${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      });

    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ message: "Failed to import CSV file" });
    }
  });

  // Get dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const envelopes = await storage.getEnvelopesByUserId(1);
      const transactions = await storage.getTransactionsByUserId(1);
      
      const totalBudget = envelopes.reduce((sum, env) => sum + parseFloat(env.budgetedAmount), 0);
      const totalSpent = transactions
        .filter(t => parseFloat(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      const remaining = totalBudget - totalSpent;

      res.json({
        totalBudget: totalBudget.toFixed(2),
        totalSpent: totalSpent.toFixed(2),
        remaining: remaining.toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Assets API
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssetsByUserId(1);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const asset = await storage.createAsset({ ...req.body, userId: 1 });
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateAsset(id, req.body);
      const asset = await storage.getAsset(id);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAsset(id);
      res.json({ message: "Asset deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Liabilities API
  app.get("/api/liabilities", async (req, res) => {
    try {
      const liabilities = await storage.getLiabilitiesByUserId(1);
      res.json(liabilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch liabilities" });
    }
  });

  app.post("/api/liabilities", async (req, res) => {
    try {
      const liability = await storage.createLiability({ ...req.body, userId: 1 });
      res.json(liability);
    } catch (error) {
      res.status(500).json({ message: "Failed to create liability" });
    }
  });

  app.patch("/api/liabilities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateLiability(id, req.body);
      const liability = await storage.getLiability(id);
      res.json(liability);
    } catch (error) {
      res.status(500).json({ message: "Failed to update liability" });
    }
  });

  app.delete("/api/liabilities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLiability(id);
      res.json({ message: "Liability deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete liability" });
    }
  });

  // Net Worth Snapshots API
  app.get("/api/net-worth-snapshots", async (req, res) => {
    try {
      const snapshots = await storage.getNetWorthSnapshotsByUserId(1);
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch net worth snapshots" });
    }
  });

  app.post("/api/net-worth-snapshots", async (req, res) => {
    try {
      const snapshot = await storage.createNetWorthSnapshot({ ...req.body, userId: 1 });
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ message: "Failed to create net worth snapshot" });
    }
  });

  // Envelope Types endpoints
  app.get("/api/envelope-types", async (req, res) => {
    try {
      const envelopeTypes = await storage.getEnvelopeTypesByUserId(1); // Demo user
      res.json(envelopeTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch envelope types" });
    }
  });

  app.post("/api/envelope-types", async (req, res) => {
    try {
      const validatedData = insertEnvelopeTypeSchema.parse({
        ...req.body,
        userId: 1 // Demo user
      });
      
      const envelopeType = await storage.createEnvelopeType(validatedData);
      res.json(envelopeType);
    } catch (error) {
      res.status(400).json({ message: "Invalid envelope type data" });
    }
  });

  app.put("/api/envelope-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingType = await storage.getEnvelopeType(id);
      
      if (!existingType || existingType.userId !== 1) {
        return res.status(404).json({ message: "Envelope type not found" });
      }

      await storage.updateEnvelopeType(id, req.body);
      res.json({ message: "Envelope type updated successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to update envelope type" });
    }
  });

  app.delete("/api/envelope-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingType = await storage.getEnvelopeType(id);
      
      if (!existingType || existingType.userId !== 1) {
        return res.status(404).json({ message: "Envelope type not found" });
      }

      if (existingType.isDefault) {
        return res.status(400).json({ message: "Cannot delete default envelope types" });
      }

      await storage.deleteEnvelopeType(id);
      res.json({ message: "Envelope type deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete envelope type" });
    }
  });

  // Two-factor authentication routes
  app.post('/api/2fa/setup', async (req, res) => {
    try {
      const { userId, username } = req.body;
      const { generateTwoFactorSecret } = await import('./twoFactorAuth');
      
      if (!userId || !username) {
        return res.status(400).json({ message: "User ID and username are required" });
      }

      const setup = await generateTwoFactorSecret(username);
      
      // Save the secret (temporary, will be confirmed when user verifies)
      await storage.updateUserTwoFactor(userId, {
        twoFactorSecret: setup.secret,
        backupCodes: setup.backupCodes,
        twoFactorEnabled: false // Not enabled until verified
      });

      res.json({
        qrCodeDataUrl: setup.qrCodeDataUrl,
        backupCodes: setup.backupCodes
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      res.status(500).json({ message: "Failed to setup two-factor authentication" });
    }
  });

  app.post('/api/2fa/verify', async (req, res) => {
    try {
      const { userId, token } = req.body;
      const { verifyTwoFactorToken } = await import('./twoFactorAuth');
      
      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Two-factor authentication not set up" });
      }

      const verification = verifyTwoFactorToken(
        user.twoFactorSecret,
        token,
        user.backupCodes || []
      );

      if (verification.isValid) {
        // Enable 2FA if token is valid
        const updates: any = { twoFactorEnabled: true };
        
        // If a backup code was used, remove it
        if (verification.usedBackupCode && user.backupCodes) {
          const { removeUsedBackupCode } = await import('./twoFactorAuth');
          updates.backupCodes = removeUsedBackupCode(user.backupCodes, verification.usedBackupCode);
        }
        
        await storage.updateUserTwoFactor(userId, updates);
        
        res.json({ 
          success: true, 
          message: "Two-factor authentication enabled successfully",
          usedBackupCode: verification.usedBackupCode || undefined
        });
      } else {
        res.status(400).json({ message: "Invalid verification code" });
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(500).json({ message: "Failed to verify two-factor authentication" });
    }
  });

  app.post('/api/2fa/validate', async (req, res) => {
    try {
      const { userId, token } = req.body;
      const { verifyTwoFactorToken } = await import('./twoFactorAuth');
      
      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Two-factor authentication not enabled" });
      }

      const verification = verifyTwoFactorToken(
        user.twoFactorSecret,
        token,
        user.backupCodes || []
      );

      if (verification.isValid) {
        // If a backup code was used, remove it
        if (verification.usedBackupCode && user.backupCodes) {
          const { removeUsedBackupCode } = await import('./twoFactorAuth');
          const updatedBackupCodes = removeUsedBackupCode(user.backupCodes, verification.usedBackupCode);
          await storage.updateUserTwoFactor(userId, { backupCodes: updatedBackupCodes });
        }
        
        res.json({ 
          valid: true,
          usedBackupCode: verification.usedBackupCode || undefined
        });
      } else {
        res.status(400).json({ valid: false, message: "Invalid authentication code" });
      }
    } catch (error) {
      console.error('Error validating 2FA:', error);
      res.status(500).json({ message: "Failed to validate two-factor authentication" });
    }
  });

  app.get('/api/2fa/status/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const info = await storage.getUserTwoFactorInfo(userId);
      
      if (!info) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(info);
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      res.status(500).json({ message: "Failed to get two-factor authentication status" });
    }
  });

  app.post('/api/2fa/disable', async (req, res) => {
    try {
      const { userId, token } = req.body;
      const { verifyTwoFactorToken } = await import('./twoFactorAuth');
      
      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required to disable 2FA" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Two-factor authentication not enabled" });
      }

      const verification = verifyTwoFactorToken(
        user.twoFactorSecret,
        token,
        user.backupCodes || []
      );

      if (verification.isValid) {
        await storage.updateUserTwoFactor(userId, {
          twoFactorEnabled: false,
          twoFactorSecret: undefined,
          backupCodes: []
        });
        
        res.json({ success: true, message: "Two-factor authentication disabled" });
      } else {
        res.status(400).json({ message: "Invalid verification code" });
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ message: "Failed to disable two-factor authentication" });
    }
  });

  app.post('/api/2fa/regenerate-backup-codes', async (req, res) => {
    try {
      const { userId, token } = req.body;
      const { verifyTwoFactorToken, generateBackupCodes } = await import('./twoFactorAuth');
      
      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Two-factor authentication not enabled" });
      }

      const verification = verifyTwoFactorToken(
        user.twoFactorSecret,
        token,
        user.backupCodes || []
      );

      if (verification.isValid) {
        const newBackupCodes = generateBackupCodes();
        await storage.updateUserTwoFactor(userId, { backupCodes: newBackupCodes });
        
        res.json({ 
          success: true,
          backupCodes: newBackupCodes,
          message: "Backup codes regenerated successfully"
        });
      } else {
        res.status(400).json({ message: "Invalid verification code" });
      }
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      res.status(500).json({ message: "Failed to regenerate backup codes" });
    }
  });

  // Akahu API test endpoint
  app.post('/api/akahu/test-connection', async (req, res) => {
    try {
      const { baseUrl, appToken, userToken } = req.body;
      
      console.log('Testing Akahu connection with:', {
        baseUrl: baseUrl,
        appToken: appToken ? `${appToken.substring(0, 10)}...` : 'missing',
        userToken: userToken ? `${userToken.substring(0, 10)}...` : 'missing'
      });
      
      if (!baseUrl || !appToken || !userToken) {
        return res.status(400).json({ 
          message: "Missing required credentials: baseUrl, appToken, and userToken are required" 
        });
      }

      // Test the Akahu API connection by making a simple request to get user info first
      // Remove any trailing slash from baseUrl
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      
      // Try the simpler /v1/me endpoint first to test authentication
      const testUrl = `${cleanBaseUrl}/v1/me`;
      console.log('Making request to:', testUrl);
      console.log('Headers:', {
        'Authorization': `Bearer ${userToken.substring(0, 10)}...`,
        'X-Akahu-ID': `${appToken.substring(0, 10)}...`
      });
      
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'X-Akahu-ID': appToken,
          'Content-Type': 'application/json',
          'User-Agent': 'MyBudgetMate/1.0'
        }
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.text();
        
        let helpMessage = '';
        if (testResponse.status === 404) {
          helpMessage = '\n\nTroubleshooting:\n• Verify your Base URL is exactly: https://api.akahu.io\n• Check your App Token starts with "app_" and User Token starts with "user_"\n• Ensure you\'re using real Akahu credentials, not placeholder examples\n• Verify your Akahu account has API access enabled';
        } else if (testResponse.status === 401) {
          helpMessage = '\n\nTroubleshooting:\n• Your tokens may be invalid or expired\n• Check your App Token and User Token are correct\n• Verify your Akahu account has the proper permissions';
        }
        
        return res.status(400).json({ 
          message: `Akahu API error (${testResponse.status}): ${errorData || 'Connection failed'}${helpMessage}` 
        });
      }

      const userResponseData = await testResponse.json();
      console.log('User info response:', userResponseData);
      
      // Now try to get accounts
      const accountsUrl = `${cleanBaseUrl}/v1/accounts`;
      console.log('Fetching accounts from:', accountsUrl);
      console.log('Using same headers for accounts request...');
      
      const accountsResponse = await fetch(accountsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'X-Akahu-ID': appToken,
          'Content-Type': 'application/json',
          'User-Agent': 'MyBudgetMate/1.0'
        }
      });
      
      console.log('Accounts response received. Status:', accountsResponse.status);
      console.log('Accounts response headers:', accountsResponse.headers);
      
      let accountsData = null;
      let accountCount = 0;
      
      if (accountsResponse.ok) {
        accountsData = await accountsResponse.json();
        console.log('Accounts response status:', accountsResponse.status);
        console.log('Accounts response data:', JSON.stringify(accountsData, null, 2));
        
        const accounts = accountsData.items || accountsData || [];
        console.log('Parsed accounts array:', accounts);
        console.log('Accounts array length:', accounts.length);
        accountCount = accounts.length;
        
        if (accountCount > 0) {
          console.log('Account details:');
          accounts.forEach((account: any, index: number) => {
            console.log(`Account ${index + 1}:`, {
              id: account._id || account.id,
              name: account.name,
              type: account.type,
              balance: account.balance
            });
          });
        }
      } else {
        const errorText = await accountsResponse.text();
        console.log('Accounts request failed:', accountsResponse.status, errorText);
        console.log('Response headers:', accountsResponse.headers);
      }
      
      // Set credentials for automatic sync
      const { setAkahuCredentials } = await import("./akahu-scheduler");
      setAkahuCredentials({ baseUrl, appToken, userToken });

      res.json({
        success: true,
        message: "Successfully connected to Akahu API",
        userInfo: {
          id: userResponseData._id || userResponseData.id,
          email: userResponseData.email || 'N/A',
          name: userResponseData.name || 'Akahu User'
        },
        accountCount: accountCount,
        accounts: accountsData?.items?.map((account: any) => ({
          id: account._id,
          name: account.name,
          type: account.type,
          balance: account.balance?.available || 0
        })) || [],
        note: accountCount > 0 
          ? `Connection verified! Found ${accountCount} linked bank account(s). Automatic transaction sync is now enabled.`
          : "Connection verified! No bank accounts linked yet. You may need to connect demo accounts through the Akahu dashboard."
      });
    } catch (error) {
      console.error('Akahu connection test error:', error);
      res.status(500).json({ 
        message: "Network error: Unable to connect to Akahu API. Please check your credentials and network connection." 
      });
    }
  });

  // Sync Akahu accounts to local database
  app.post('/api/akahu/sync-accounts', async (req, res) => {
    try {
      const { baseUrl, appToken, userToken } = req.body;
      
      if (!baseUrl || !appToken || !userToken) {
        return res.status(400).json({ message: "Missing Akahu credentials" });
      }

      const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
      const accountsUrl = `${cleanBaseUrl}/v1/accounts`;
      
      const accountsResponse = await fetch(accountsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'X-Akahu-ID': appToken,
          'Content-Type': 'application/json',
          'User-Agent': 'MyBudgetMate/1.0'
        }
      });
      
      if (!accountsResponse.ok) {
        return res.status(400).json({ message: "Failed to fetch accounts from Akahu" });
      }

      const accountsData = await accountsResponse.json();
      const akahuAccounts = accountsData.items || [];
      
      // Sync each account to local database
      const syncedAccounts = [];
      const syncedConnections = [];
      
      // Group accounts by connection to create one bank connection per bank
      const connectionMap = new Map();
      for (const akahuAccount of akahuAccounts) {
        const connectionId = akahuAccount.connection._id;
        if (!connectionMap.has(connectionId)) {
          connectionMap.set(connectionId, {
            connection: akahuAccount.connection,
            accounts: []
          });
        }
        connectionMap.get(connectionId).accounts.push(akahuAccount);
      }
      
      // Process each connection
      for (const [connectionId, data] of connectionMap) {
        const { connection, accounts } = data;
        
        // Check if bank connection already exists
        const existingConnections = await storage.getBankConnectionsByUserId(1);
        let bankConnection = existingConnections.find(conn => 
          conn.externalId === connectionId
        );
        
        if (!bankConnection) {
          // Create new bank connection
          const connectionData = {
            userId: 1,
            bankId: 'demo-bank', // Generic ID for demo
            bankName: connection.name,
            accountNumbers: [],
            isActive: true,
            lastSync: new Date(),
            consentExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            externalId: connectionId
          };
          
          bankConnection = await storage.createBankConnection(connectionData);
          syncedConnections.push(bankConnection);
        } else {
          // Update last sync time
          await storage.updateBankConnection(bankConnection.id, {
            lastSync: new Date()
          });
        }
        
        // Process accounts under this connection
        for (const akahuAccount of accounts) {
          const accountData = {
            userId: 1, // Demo user
            name: `${akahuAccount.name} (${connection.name})`,
            type: akahuAccount.type.toLowerCase() === 'checking' ? 'bank' : 
                  akahuAccount.type.toLowerCase() === 'savings' ? 'bank' : 
                  akahuAccount.type.toLowerCase() === 'credit' ? 'credit' : 'bank',
            balance: (akahuAccount.balance?.current || 0).toString(),
            isActive: true,
            akahuId: akahuAccount._id,
            akahuAccountNumber: akahuAccount.formatted_account
          };
          
          // Check if account already exists
          const existingAccounts = await storage.getAccountsByUserId(1);
          const existingAccount = existingAccounts.find(acc => 
            (acc as any).akahuId === akahuAccount._id
          );
          
          if (existingAccount) {
            // Update existing account balance
            await storage.updateAccount(existingAccount.id, {
              balance: accountData.balance
            });
            syncedAccounts.push(existingAccount);
          } else {
            // Create new account
            const newAccount = await storage.createAccount(accountData);
            syncedAccounts.push(newAccount);
          }
        }
      }
      
      res.json({
        success: true,
        message: `Successfully synced ${syncedAccounts.length} account(s) and ${syncedConnections.length} bank connection(s)`,
        accounts: syncedAccounts,
        connections: syncedConnections
      });
      
    } catch (error) {
      console.error('Akahu sync error:', error);
      res.status(500).json({ message: "Failed to sync Akahu accounts" });
    }
  });

  // Sync Akahu transactions from connected accounts
  app.post('/api/akahu/sync-transactions', async (req, res) => {
    try {
      const { baseUrl, appToken, userToken } = req.body;
      
      if (!baseUrl || !appToken || !userToken) {
        return res.status(400).json({ message: "Missing Akahu credentials" });
      }

      const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
      
      // First get all connected accounts
      const accountsUrl = `${cleanBaseUrl}/v1/accounts`;
      const accountsResponse = await fetch(accountsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'X-Akahu-ID': appToken,
          'Content-Type': 'application/json',
          'User-Agent': 'MyBudgetMate/1.0'
        }
      });
      
      if (!accountsResponse.ok) {
        return res.status(400).json({ message: "Failed to fetch accounts from Akahu" });
      }

      const accountsData = await accountsResponse.json();
      const akahuAccounts = accountsData.items || [];
      
      let totalImported = 0;
      const importedTransactions = [];
      
      // Get transactions for each account
      for (const akahuAccount of akahuAccounts) {
        const transactionsUrl = `${cleanBaseUrl}/v1/accounts/${akahuAccount._id}/transactions`;
        
        try {
          const transactionsResponse = await fetch(transactionsUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'X-Akahu-ID': appToken,
              'Content-Type': 'application/json',
              'User-Agent': 'MyBudgetMate/1.0'
            }
          });
          
          if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            const transactions = transactionsData.items || [];
            
            console.log(`Found ${transactions.length} transactions for account ${akahuAccount.name}`);
            
            // Find local account that matches this Akahu account
            const localAccounts = await storage.getAccountsByUserId(1);
            const localAccount = localAccounts.find(acc => 
              (acc as any).akahuId === akahuAccount._id
            );
            
            if (localAccount && transactions.length > 0) {
              // Import transactions
              for (const akahuTx of transactions.slice(0, 10)) { // Limit to recent 10 transactions
                try {
                  // Check if transaction already exists
                  const existingTransactions = await storage.getTransactionsByUserId(1);
                  const exists = existingTransactions.some(tx => 
                    tx.bankTransactionId === akahuTx._id
                  );
                  
                  if (!exists) {
                    const transactionData = {
                      userId: 1,
                      accountId: localAccount.id,
                      merchant: akahuTx.merchant?.name || 'Unknown Merchant',
                      description: akahuTx.description || akahuTx.merchant?.name || 'Bank Transaction',
                      amount: akahuTx.amount.toString(),
                      date: new Date(akahuTx.date),
                      isApproved: false,
                      isTransfer: false,
                      sourceType: 'akahu_sync',
                      bankTransactionId: akahuTx._id,
                      bankReference: akahuTx.reference || null,
                      bankMemo: akahuTx.memo || null
                    };
                    
                    const newTransaction = await storage.createTransaction(transactionData);
                    importedTransactions.push(newTransaction);
                    totalImported++;
                    
                    console.log(`Imported transaction: ${akahuTx.merchant?.name || 'Unknown'} - $${akahuTx.amount}`);
                  }
                } catch (txError) {
                  console.error('Error importing transaction:', txError);
                }
              }
            }
          }
        } catch (accountError) {
          console.error(`Error fetching transactions for account ${akahuAccount.name}:`, accountError);
        }
      }
      
      res.json({
        success: true,
        message: `Successfully imported ${totalImported} new transactions from Akahu`,
        transactionCount: totalImported,
        transactions: importedTransactions.slice(0, 5) // Return first 5 for preview
      });
      
    } catch (error) {
      console.error('Akahu transaction sync error:', error);
      res.status(500).json({ message: "Failed to sync Akahu transactions" });
    }
  });

  // Add catch-all routes AFTER all specific API routes
  
  // Handle any unmatched API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      message: 'This API endpoint is not implemented in the Replit environment'
    });
  });



  const httpServer = createServer(app);
  return httpServer;
}
