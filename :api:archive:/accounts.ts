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
const DEMO_ACCOUNTS = [
  {
    id: 1,
    name: "ASB Everyday Account",
    type: "checking",
    balance: "1250.75",
    userId: 1,
    isActive: true,
    openingBalance: "1000.00",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-07T00:00:00Z"
  },
  {
    id: 2,
    name: "ASB Savings",
    type: "savings", 
    balance: "5430.22",
    userId: 1,
    isActive: true,
    openingBalance: "5000.00",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-07T00:00:00Z"
  },
  {
    id: 3,
    name: "ANZ Credit Card",
    type: "credit",
    balance: "-234.56",
    userId: 1,
    isActive: true,
    openingBalance: "0.00",
    creditLimit: "5000.00",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-07T00:00:00Z"
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
      return res.json(DEMO_ACCOUNTS);

    case 'POST':
      const newAccount = {
        id: DEMO_ACCOUNTS.length + 1,
        ...req.body,
        userId: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      DEMO_ACCOUNTS.push(newAccount);
      return res.status(201).json(newAccount);

    case 'PATCH':
      const accountId = parseInt(req.query.id as string);
      const accountIndex = DEMO_ACCOUNTS.findIndex(a => a.id === accountId);
      
      if (accountIndex === -1) {
        return res.status(404).json({ message: 'Account not found' });
      }
      
      DEMO_ACCOUNTS[accountIndex] = {
        ...DEMO_ACCOUNTS[accountIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      return res.json(DEMO_ACCOUNTS[accountIndex]);

    case 'DELETE':
      const deleteId = parseInt(req.query.id as string);
      const deleteIndex = DEMO_ACCOUNTS.findIndex(a => a.id === deleteId);
      
      if (deleteIndex === -1) {
        return res.status(404).json({ message: 'Account not found' });
      }
      
      DEMO_ACCOUNTS.splice(deleteIndex, 1);
      return res.status(204).send('');

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}