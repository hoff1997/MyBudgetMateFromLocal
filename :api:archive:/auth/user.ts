import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Return demo user data
  return res.json({
    id: '1',
    username: 'demo',
    email: 'demo@mybudgetmate.com',
    firstName: 'Demo',
    lastName: 'User',
    profileImageUrl: null,
    budgetName: 'My Budget Mate Demo',
    payCycle: 'monthly'
  });
}