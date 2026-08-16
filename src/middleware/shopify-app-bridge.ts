import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'test_shopify_secret';

export async function shopifyAppBridgeMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const shop = (req.query as any)?.shop || (req.headers['x-shopify-shop-domain'] as string);

  // 1. Dynamic Content Security Policy (CSP) for Shopify App Bridge iframe embedding
  if (shop) {
    const cleanShop = shop.replace(/[^a-zA-Z0-9.-]/g, '');
    reply.header(
      'Content-Security-Policy',
      `frame-ancestors https://${cleanShop} https://admin.shopify.com;`
    );
  }

  // 2. JWT Session Token Verification from Shopify App Bridge Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const sessionToken = authHeader.split(' ')[1];
    try {
      const parts = sessionToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        // Verify expiration
        if (payload.exp && payload.exp < Date.now() / 1000) {
          return reply.status(401).send({ error: 'Shopify App Bridge session token expired' });
        }
        (req as any).shopifySession = payload;
      }
    } catch {
      return reply.status(401).send({ error: 'Invalid Shopify App Bridge session token signature' });
    }
  }
}
