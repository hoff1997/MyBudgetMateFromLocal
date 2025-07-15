import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch {
    return null;
  }
}

// Demo data fallback
const DEMO_TRANSACTIONS = [
  {
    id: 1,
    merchant: "Countdown",
    amount: "-45.67",
    date: "2025-01-05",
    accountId: 1,
    userId: 1,
    isApproved: true,
    description: "Weekly groceries"
  },
  {
    id: 2,
    merchant: "BP",
    amount: "-78.30",
    date: "2025-01-04", 
    accountId: 1,
    userId: 1,
    isApproved: false,
    description: "Fuel"
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Try Supabase first, fallback to demo data
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      switch (req.method) {
        case 'GET':
          const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('userId', 1)
            .order('date', { ascending: false });
          
          if (error) throw error;
          return res.json(transactions || []);

        case 'POST':
          const { data: newTransaction, error: createError } = await supabase
            .from('transactions')
            .insert([{ ...req.body, userId: 1 }])
            .select()
            .single();
          
          if (createError) throw createError;
          return res.status(201).json(newTransaction);

        case 'PATCH':
          const transactionId = req.query.id;
          const { data: updatedTransaction, error: updateError } = await supabase
            .from('transactions')
            .update(req.body)
            .eq('id', transactionId)
            .eq('userId', 1)
            .select()
            .single();
          
          if (updateError) throw updateError;
          return res.json(updatedTransaction);

        default:
          return res.status(405).json({ message: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Supabase error:', error);
      // Fall through to demo data
    }
  }

  // Demo data fallback
  switch (req.method) {
    case 'GET':
      return res.json(DEMO_TRANSACTIONS);

    case 'POST':
      const newTransaction = {
        id: DEMO_TRANSACTIONS.length + 1,
        ...req.body,
        userId: 1,
        isApproved: false
      };
      DEMO_TRANSACTIONS.push(newTransaction as any);
      return res.status(201).json(newTransaction);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}