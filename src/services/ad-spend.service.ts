import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

export interface MarketingEfficiencyReport {
  clientId: string;
  periodStart: string;
  periodEnd: string;
  totalAdSpend: number;
  metaAdSpend: number;
  googleAdSpend: number;
  totalNetSales: number;
  retentionNetSales: number;
  blendedMer: number;         // Total Net Sales / Total Ad Spend
  retentionMultiplier: number; // Retention Net Sales / Total Ad Spend
  blendedCac: number;
  sixtyDayLtv: number;
  ltvToCacRatio: number;
}

export class AdSpendService {
  /**
   * Blends Meta & Google Ads acquisition spend with ClickHouse retention metrics
   * to compute true Marketing Efficiency Ratio (MER) and LTV:CAC ratios
   */
  static async calculateMer(
    tenantId: string,
    clientId: string,
    periodStart: string,
    periodEnd: string,
    metaSpend: number,
    googleSpend: number,
    newCustomersAcquired: number
  ): Promise<MarketingEfficiencyReport> {
    const totalAdSpend = metaSpend + googleSpend;

    // Pull true net sales & retention sales from ClickHouse
    const query = `
      SELECT
        sum(net_revenue) as total_net,
        sumIf(net_revenue, channel IN ('email', 'sms')) as retention_net
      FROM events
      WHERE tenant_id = {tenantId:UUID}
        AND client_id = {clientId:UUID}
        AND event_type = 'placed_order'
        AND toDate(event_time) >= {periodStart:Date}
        AND toDate(event_time) <= {periodEnd:Date}
    `;

    const result = await clickhouse.query({
      query,
      query_params: { tenantId, clientId, periodStart, periodEnd },
      format: 'JSONEachRow'
    });

    const rows = await result.json<any>();
    const totalNet = parseFloat(rows[0]?.total_net || '0');
    const retentionNet = parseFloat(rows[0]?.retention_net || '0');

    const blendedMer = totalAdSpend > 0 ? totalNet / totalAdSpend : 0;
    const retentionMultiplier = totalAdSpend > 0 ? retentionNet / totalAdSpend : 0;
    const blendedCac = newCustomersAcquired > 0 ? totalAdSpend / newCustomersAcquired : 0;
    
    // Estimated 60-day LTV
    const sixtyDayLtv = blendedCac > 0 ? blendedCac * (blendedMer * 0.8) : 0;
    const ltvToCacRatio = blendedCac > 0 ? sixtyDayLtv / blendedCac : 0;

    return {
      clientId,
      periodStart,
      periodEnd,
      totalAdSpend: Math.round(totalAdSpend * 100) / 100,
      metaAdSpend: Math.round(metaSpend * 100) / 100,
      googleAdSpend: Math.round(googleSpend * 100) / 100,
      totalNetSales: Math.round(totalNet * 100) / 100,
      retentionNetSales: Math.round(retentionNet * 100) / 100,
      blendedMer: Math.round(blendedMer * 100) / 100,
      retentionMultiplier: Math.round(retentionMultiplier * 100) / 100,
      blendedCac: Math.round(blendedCac * 100) / 100,
      sixtyDayLtv: Math.round(sixtyDayLtv * 100) / 100,
      ltvToCacRatio: Math.round(ltvToCacRatio * 10) / 10
    };
  }
}
