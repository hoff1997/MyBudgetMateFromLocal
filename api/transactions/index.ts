import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Demo data for Vercel deployment
const DEMO_TRANSACTIONS = [
  {
    id: 1,
    userId: 1,
    accountId: 1,
    amount: '-45.50',
    merchant: 'Countdown Supermarket',
    description: 'Weekly groceries',
    date: new Date('2024-12-30').toISOString(),
    isApproved: true,
    isTransfer: false
  },
  {
    id: 2,
    userId: 1,
    accountId: 1,
    amount: '-12.00',
    merchant: 'Netflix',
    description: 'Monthly subscription',
    date: new Date('2024-12-29').toISOString(),
    isApproved: false,
    isTransfer: false
  },
  {
    id: 3,
    userId: 1,
    accountId: 1,
    amount: '-25.80',
    merchant: 'Z Energy',
    description: 'Fuel',
    date: new Date('2024-12-28').toISOString(),
    isApproved: true,
    isTransfer: false
  }
];

function verifyToken(token: string) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  switch (req.method) {
    case 'GET':
      return res.json(DEMO_TRANSACTIONS);

    case 'POST':
      const { amount, merchant, description, accountId, date } = req.body;
      
      if (!amount || !merchant) {
        return res.status(400).json({ message: 'Amount and merchant required' });
      }

      const newTransaction = {
        id: DEMO_TRANSACTIONS.length + 1,
        userId: 1,
        accountId: accountId || 1,
        amount,
        merchant,
        description: description || null,
        date: date || new Date().toISOString(),
        isApproved: false,
        isTransfer: false
      };

      DEMO_TRANSACTIONS.push(newTransaction as any);
      return res.status(201).json(newTransaction);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}