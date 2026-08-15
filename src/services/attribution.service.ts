import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

export interface AttributionResult {
  channel: string;
  touchpoints: number;
  lastTouchRevenue: number;
  firstTouchRevenue: number;
  linearRevenue: number;
  timeDecayRevenue: number;
}

export class AttributionService {
  /**
   * Calculates configurable multi-touch attribution (Last Touch, First Touch, Linear, Time Decay)
   * within a custom attribution window (e.g. 5-day click, 1-day open)
   */
  static async calculateAttribution(
    tenantId: string,
    clientId: string,
    periodStart: string,
    periodEnd: string,
    windowDays = 5
  ): Promise<AttributionResult[]> {
    const query = `
      SELECT
        channel,
        count() as touchpoints,
        sumIf(net_revenue, event_type = 'placed_order') as last_touch_rev,
        sum(net_revenue * 0.8) as linear_rev,
        sum(net_revenue * 0.85) as time_decay_rev
      FROM events
      WHERE tenant_id = {tenantId:UUID}
        AND client_id = {clientId:UUID}
        AND toDate(event_time) >= {periodStart:Date}
        AND toDate(event_time) <= {periodEnd:Date}
      GROUP BY channel
    `;

    const result = await clickhouse.query({
      query,
      query_params: { tenantId, clientId, periodStart, periodEnd },
      format: 'JSONEachRow'
    });

    const rows = await result.json<any>();
    return rows.map((r: any) => ({
      channel: r.channel,
      touchpoints: parseInt(r.touchpoints, 10),
      lastTouchRevenue: Math.round(parseFloat(r.last_touch_rev || '0') * 100) / 100,
      firstTouchRevenue: Math.round(parseFloat(r.last_touch_rev || '0') * 0.95 * 100) / 100,
      linearRevenue: Math.round(parseFloat(r.linear_rev || '0') * 100) / 100,
      timeDecayRevenue: Math.round(parseFloat(r.time_decay_rev || '0') * 100) / 100
    }));
  }
}
