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
const DEMO_ENVELOPES = [
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
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-07T00:00:00Z"
  },
  {
    id: 2,
    name: "Transport",
    budgetedAmount: "300.00", 
    currentBalance: "245.30",
    icon: "🚗",
    userId: 1,
    isActive: true,
    categoryId: 2,
    isMonitored: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-07T00:00:00Z"
  },
  {
    id: 3,
    name: "Dining Out",
    budgetedAmount: "200.00",
    currentBalance: "156.80",
    icon: "🍽️",
    userId: 1,
    isActive: true,
    categoryId: 3,
    isMonitored: true,
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
      return res.json(DEMO_ENVELOPES);

    case 'POST':
      const newEnvelope = {
        id: DEMO_ENVELOPES.length + 1,
        ...req.body,
        userId: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      DEMO_ENVELOPES.push(newEnvelope);
      return res.status(201).json(newEnvelope);

    case 'PATCH':
      const envelopeId = parseInt(req.query.id as string);
      const envelopeIndex = DEMO_ENVELOPES.findIndex(e => e.id === envelopeId);
      
      if (envelopeIndex === -1) {
        return res.status(404).json({ message: 'Envelope not found' });
      }
      
      DEMO_ENVELOPES[envelopeIndex] = {
        ...DEMO_ENVELOPES[envelopeIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      return res.json(DEMO_ENVELOPES[envelopeIndex]);

    case 'DELETE':
      const deleteId = parseInt(req.query.id as string);
      const deleteIndex = DEMO_ENVELOPES.findIndex(e => e.id === deleteId);
      
      if (deleteIndex === -1) {
        return res.status(404).json({ message: 'Envelope not found' });
      }
      
      DEMO_ENVELOPES.splice(deleteIndex, 1);
      return res.status(204).send('');

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}