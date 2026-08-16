import { FastifyReply } from 'fastify';

interface SseClient {
  id: string;
  tenantId: string;
  reply: FastifyReply;
}

export class SseService {
  private static clients: SseClient[] = [];

  static registerClient(tenantId: string, clientId: string, reply: FastifyReply) {
    // Configure SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    const clientRecord: SseClient = { id: clientId, tenantId, reply };
    this.clients.push(clientRecord);

    // Initial handshake event
    reply.raw.write(`data: ${JSON.stringify({ type: 'HANDSHAKE', status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    reply.raw.on('close', () => {
      this.clients = this.clients.filter(c => c !== clientRecord);
    });
  }

  static broadcastEvent(tenantId: string, eventType: string, data: Record<string, any>) {
    const tenantClients = this.clients.filter(c => c.tenantId === tenantId);
    const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });

    tenantClients.forEach(c => {
      try {
        c.reply.raw.write(`data: ${payload}\n\n`);
      } catch (err) {
        // Client disconnected
      }
    });
  }
}
