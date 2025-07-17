import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Demo data for Vercel deployment
const DEMO_ENVELOPES = [
  {
    id: 1,
    name: 'Groceries',
    icon: '🛒',
    budgetedAmount: '600.00',
    currentBalance: '450.00',
    categoryId: 1,
    userId: 1,
    isActive: true,
    isMonitored: true,
    sortOrder: 1
  },
  {
    id: 2,
    name: 'Entertainment',
    icon: '🎬',
    budgetedAmount: '200.00',
    currentBalance: '150.00',
    categoryId: 2,
    userId: 1,
    isActive: true,
    isMonitored: false,
    sortOrder: 2
  },
  {
    id: 3,
    name: 'Transportation',
    icon: '🚗',
    budgetedAmount: '300.00',
    currentBalance: '250.00',
    categoryId: 3,
    userId: 1,
    isActive: true,
    isMonitored: true,
    sortOrder: 3
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
      return res.json(DEMO_ENVELOPES);

    case 'POST':
      const { name, icon, budgetedAmount, categoryId } = req.body;
      
      if (!name || !budgetedAmount) {
        return res.status(400).json({ message: 'Name and budgeted amount required' });
      }

      const newEnvelope = {
        id: DEMO_ENVELOPES.length + 1,
        name,
        icon: icon || '📝',
        budgetedAmount,
        currentBalance: '0.00',
        categoryId: categoryId || 1,
        userId: 1,
        isActive: true,
        isMonitored: false,
        sortOrder: DEMO_ENVELOPES.length + 1
      };

      DEMO_ENVELOPES.push(newEnvelope as any);
      return res.status(201).json(newEnvelope);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}