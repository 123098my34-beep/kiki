import { FastifyRequest, FastifyReply } from 'fastify';

export async function tenantDomainMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const host = req.headers.host || '';
  
  // Exclude primary root and API hostnames
  if (host.includes('pulseretention.io') || host.includes('localhost')) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'app' && subdomain !== 'api' && subdomain !== 'localhost') {
      (req as any).tenantSlug = subdomain;
    }
    return;
  }

  // Custom CNAME Domain Resolution (e.g. analytics.partneragency.com)
  // In production, queries PostgreSQL for organizations.custom_domain = host
  const customDomain = host.toLowerCase();
  (req as any).customDomain = customDomain;
}
