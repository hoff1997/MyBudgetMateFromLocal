import { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url = '', method = 'GET', body } = req

  // === /api/ping ===
  if (url.includes('/api/ping')) {
    return res.json({ message: 'pong' })
  }

  // === /api/test ===
  if (url.includes('/api/test')) {
    return res.json({ status: 'Test passed', timestamp: Date.now() })
  }

  // === /api/envelopes ===
  if (url.includes('/api/envelopes')) {
    if (method === 'GET') {
      return res.json([
        { id: 1, name: 'Groceries', amount: 300 },
        { id: 2, name: 'Rent', amount: 1200 },
      ])
    }

    if (method === 'POST') {
      const { name, amount } = body
      if (!name || !amount) {
        return res.status(400).json({ error: 'Missing envelope name or amount' })
      }

      return res.status(201).json({ id: Date.now(), name, amount })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // === /api/transactions ===
  if (url.includes('/api/transactions')) {
    if (method === 'GET') {
      return res.json([
        { id: 1, envelope: 'Groceries', amount: -50, date: '2025-07-01' },
        { id: 2, envelope: 'Rent', amount: -1200, date: '2025-07-02' },
      ])
    }

    if (method === 'POST') {
      const { envelope, amount } = body
      if (!envelope || !amount) {
        return res.status(400).json({ error: 'Missing transaction envelope or amount' })
      }

      return res.status(201).json({ id: Date.now(), envelope, amount, date: new Date().toISOString() })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Catch-all for unrecognized routes
  return res.status(404).json({ error: 'Route not found' })
}
