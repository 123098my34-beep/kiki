import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';

export interface TraceContext {
  traceId: string;
  spanId: string;
  tenantId?: string;
  clientId?: string;
}

export class TelemetryService {
  /**
   * Injects or extracts W3C traceparent headers for distributed context propagation
   */
  static extractOrCreateTrace(req: FastifyRequest): TraceContext {
    const traceparent = (req.headers['traceparent'] as string) || '';
    let traceId = '';
    let spanId = '';

    if (traceparent.startsWith('00-')) {
      const parts = traceparent.split('-');
      if (parts.length >= 3) {
        traceId = parts[1];
        spanId = parts[2];
      }
    }

    if (!traceId) {
      traceId = crypto.randomBytes(16).toString('hex');
      spanId = crypto.randomBytes(8).toString('hex');
    }

    return {
      traceId,
      spanId,
      tenantId: (req as any).tenantId,
      clientId: (req.params as any)?.clientId
    };
  }

  /**
   * Emits structured JSON log with semantic trace attributes
   */
  static log(level: 'info' | 'warn' | 'error', message: string, ctx: Record<string, any>) {
    const payload = {
      level,
      timestamp: new Date().toISOString(),
      message,
      service: 'pulse-retention-api',
      ...ctx
    };

    if (level === 'error') {
      console.error(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
  }
}
