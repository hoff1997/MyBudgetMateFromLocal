import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Demo credentials for Vercel deployment
const DEMO_CREDENTIALS = {
  'demo': 'mybudgetmate',
  'user': 'demo123', 
  'test': 'budgetmate'
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  // Check demo credentials
  if (DEMO_CREDENTIALS[username as keyof typeof DEMO_CREDENTIALS] !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Generate JWT token
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const token = jwt.sign(
    { userId: '1', username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ 
    token,
    user: {
      id: 1,
      username,
      email: `${username}@example.com`,
      firstName: username.charAt(0).toUpperCase() + username.slice(1),
      lastName: 'User'
    }
  });
}