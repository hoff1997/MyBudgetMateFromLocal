import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Demo data for Vercel deployment
const DEMO_ACCOUNTS = [
  {
    id: 1,
    name: 'ASB Everyday Account',
    type: 'checking',
    balance: '2150.00',
    userId: 1,
    isActive: true
  },
  {
    id: 2,
    name: 'ASB Savings Account',
    type: 'savings',
    balance: '5000.00',
    userId: 1,
    isActive: true
  },
  {
    id: 3,
    name: 'ANZ Credit Card',
    type: 'credit',
    balance: '-450.00',
    userId: 1,
    isActive: true
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
      return res.json(DEMO_ACCOUNTS);

    case 'POST':
      const { name, type, balance } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ message: 'Name and type required' });
      }

      const newAccount = {
        id: DEMO_ACCOUNTS.length + 1,
        name,
        type,
        balance: balance || '0.00',
        userId: 1,
        isActive: true
      };

      DEMO_ACCOUNTS.push(newAccount as any);
      return res.status(201).json(newAccount);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}