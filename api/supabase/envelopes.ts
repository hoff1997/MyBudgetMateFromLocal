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
    isMonitored: true
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
    isMonitored: false
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
          const { data: envelopes, error } = await supabase
            .from('envelopes')
            .select('*')
            .eq('userId', 1)
            .eq('isActive', true);
          
          if (error) throw error;
          return res.json(envelopes || []);

        case 'POST':
          const { data: newEnvelope, error: createError } = await supabase
            .from('envelopes')
            .insert([{ ...req.body, userId: 1 }])
            .select()
            .single();
          
          if (createError) throw createError;
          return res.status(201).json(newEnvelope);

        case 'PATCH':
          const envelopeId = req.query.id;
          const { data: updatedEnvelope, error: updateError } = await supabase
            .from('envelopes')
            .update(req.body)
            .eq('id', envelopeId)
            .eq('userId', 1)
            .select()
            .single();
          
          if (updateError) throw updateError;
          return res.json(updatedEnvelope);

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
      return res.json(DEMO_ENVELOPES);

    case 'POST':
      const newEnvelope = {
        id: DEMO_ENVELOPES.length + 1,
        ...req.body,
        userId: 1,
        isActive: true
      };
      DEMO_ENVELOPES.push(newEnvelope as any);
      return res.status(201).json(newEnvelope);

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}