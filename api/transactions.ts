import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch {
    return null;
  }
}

// Demo data
const DEMO_TRANSACTIONS = [
  {
    id: 1,
    merchant: "Countdown",
    amount: "-45.67",
    date: "2025-01-05",
    accountId: 1,
    userId: 1,
    isApproved: true,
    description: "Weekly groceries",
    createdAt: "2025-01-05T10:30:00Z"
  },
  {
    id: 2,
    merchant: "BP",
    amount: "-78.30",
    date: "2025-01-04", 
    accountId: 1,
    userId: 1,
    isApproved: false,
    description: "Fuel",
    createdAt: "2025-01-04T15:20:00Z"
  },
  {
    id: 3,
    merchant: "New World",
    amount: "-67.89",
    date: "2025-01-03",
    accountId: 1,
    userId: 1,
    isApproved: true,
    description: "Groceries",
    createdAt: "2025-01-03T11:45:00Z"
  },
  {
    id: 4,
    merchant: "Uber Eats",
    amount: "-23.50",
    date: "2025-01-02",
    accountId: 1,
    userId: 1,
    isApproved: false,
    description: "Dinner delivery",
    createdAt: "2025-01-02T19:15:00Z"
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

  switch (req.method) {
    case 'GET':
      return res.json(DEMO_TRANSACTIONS);

    case 'POST':
      const newTransaction = {
        id: DEMO_TRANSACTIONS.length + 1,
        ...req.body,
        userId: 1,
        isApproved: false,
        createdAt: new Date().toISOString()
      };
      DEMO_TRANSACTIONS.push(newTransaction);
      return res.status(201).json(newTransaction);

    case 'PATCH':
      const transactionId = parseInt(req.query.id as string);
      const transactionIndex = DEMO_TRANSACTIONS.findIndex(t => t.id === transactionId);
      
      if (transactionIndex === -1) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      DEMO_TRANSACTIONS[transactionIndex] = {
        ...DEMO_TRANSACTIONS[transactionIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      return res.json(DEMO_TRANSACTIONS[transactionIndex]);

    case 'DELETE':
      const deleteId = parseInt(req.query.id as string);
      const deleteIndex = DEMO_TRANSACTIONS.findIndex(t => t.id === deleteId);
      
      if (deleteIndex === -1) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      DEMO_TRANSACTIONS.splice(deleteIndex, 1);
      return res.status(204).send('');

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}