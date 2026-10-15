import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../server/apiRouter';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const appUrl = process.env.APP_URL || `${forwardedProto}://${host}`;

  try {
    const handled = await handleApiRequest(req, res, appUrl);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'API route not found' }));
    }
  } catch (err: any) {
    console.error('Vercel Serverless Function Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Server error' }));
  }
}
