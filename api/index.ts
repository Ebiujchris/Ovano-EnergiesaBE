import { getApp } from '../src/lambda';
import type { Request, Response } from 'express';

function getAllowedOrigin(requestOrigin: string | undefined): string {
  if (!requestOrigin) return '*';

  // Allow any vercel.app subdomain containing 'ovano-energies'
  if (requestOrigin.includes('ovano-energies') && requestOrigin.endsWith('.vercel.app')) {
    return requestOrigin;
  }

  // Allow localhost dev
  if (requestOrigin.startsWith('http://localhost')) {
    return requestOrigin;
  }

  // Allow explicitly listed origins from env
  const allowed = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  if (allowed.includes(requestOrigin)) return requestOrigin;

  // Fallback — return the first allowed origin or wildcard
  return allowed[0] || '*';
}

function setCorsHeaders(req: Request, res: Response) {
  const origin = getAllowedOrigin(req.headers.origin as string | undefined);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: Request, res: Response) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const app = await getApp();
  app(req, res);
}
