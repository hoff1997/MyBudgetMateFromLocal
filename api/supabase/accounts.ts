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
const DEMO_ACCOUNTS = [
  {
    id: 1,
    name: "ASB Everyday Account",
    type: "checking",
    balance: "1250.75",
    userId: 1,
    isActive: true
  },
  {
    id: 2,
    name: "ASB Savings",
    type: "savings", 
    balance: "5430.22",
    userId: 1,
    isActive: true
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
          const { data: accounts, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('userId', 1)
            .eq('isActive', true);
          
          if (error) throw error;
          return res.json(accounts || []);

        case 'POST':
          const { data: newAccount, error: createError } = await supabase
            .from('accounts')
            .insert([{ ...req.body, userId: 1 }])
            .select()
            .single();
          
          if (createError) throw createError;
          return res.status(201).json(newAccount);

        case 'PATCH':
          const accountId = req.query.id;
          const { data: updatedAccount, error: updateError } = await supabase
            .from('accounts')
            .update(req.body)
            .eq('id', accountId)
            .eq('userId', 1)
            .select()
            .single();
          
          if (updateError) throw updateError;
          return res.json(updatedAccount);

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
      return res.json(DEMO_ACCOUNTS);

    case 'POST':
      const newAccount = {
        id: DEMO_ACCOUNTS.length + 1,
        ...req.body,
        userId: 1,
        isActive: true
      };
      DEMO_ACCOUNTS.push(newAccount as any);
      return res.status(201).json(newAccount);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}