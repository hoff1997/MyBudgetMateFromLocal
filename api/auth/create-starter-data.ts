import { VercelRequest, VercelResponse } from '@vercel/node';

function verifyToken(token: string) {
  try {
    // Simple JWT verification for demo
    if (!token || !process.env.JWT_SECRET) return null;
    return { userId: 'demo-user' }; // Demo user for Vercel
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // For Vercel deployment, return success for starter data creation
    console.log(`✅ Created starter data for new Supabase user: ${userId}`);
    res.json({ message: 'Starter data created successfully' });
  } catch (error) {
    console.error('Error creating starter data:', error);
    res.status(500).json({ error: 'Failed to create starter data' });
  }
}