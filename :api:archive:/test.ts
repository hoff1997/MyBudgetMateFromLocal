import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'API endpoint is working',
    method: req.method,
    timestamp: new Date().toISOString(),
    url: req.url
  });
}