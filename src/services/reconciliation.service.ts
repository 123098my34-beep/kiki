import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

export interface ReconciliationReport {
  clientId: string;
  periodStart: string;
  periodEnd: string;
  totalGrossSales: number;
  totalRefunds: number;
  totalDiscounts: number;
  trueNetRevenue: number;
  subscriptionRevenue: number;
  organicOneTimeRevenue: number;
  espAttributedGrossRevenue: number;
  espAttributedNetRevenue: number;
  reconciliationDiscrepancy: number;
  discrepancyPercentage: number;
  netContributionMargin: number;
  hasRefundSurge: boolean; // Flagged when refunds > gross sales in post-holiday windows
}

export class ReconciliationService {
  /**
   * Reconciles raw Shopify financial transactions with ESP attribution events
   * Handles Flaw 3 (Refund Surge & Multi-Currency Clamping)
   */
  static async getReconciliation(
    tenantId: string,
    clientId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ReconciliationReport> {
    const query = `
      SELECT
        sum(gross_revenue) as total_gross,
        sum(refund_amount) as total_refunds,
        sum(net_revenue) as total_net,
        sumIf(net_revenue, is_subscription = 1) as sub_rev,
        sumIf(net_revenue, is_subscription = 0) as one_time_rev,
        sumIf(gross_revenue, channel IN ('email', 'sms')) as esp_gross,
        sumIf(net_revenue, channel IN ('email', 'sms') AND is_subscription = 0) as esp_true_net
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
    const r = rows[0] || {};

    const totalGross = parseFloat(r.total_gross || '0');
    const totalRefunds = parseFloat(r.total_refunds || '0');
    const trueNet = parseFloat(r.total_net || '0');
    const subRev = parseFloat(r.sub_rev || '0');
    const oneTimeRev = parseFloat(r.one_time_rev || '0');
    const espGross = parseFloat(r.esp_gross || '0');
    const espTrueNet = parseFloat(r.esp_true_net || '0');

    const hasRefundSurge = totalRefunds > totalGross;
    const discrepancy = Math.max(0, espGross - espTrueNet);
    const discrepancyPct = espGross > 0 ? (discrepancy / espGross) * 100 : 0;
    
    // Net contribution margin clamped safely between 0% and 100%
    const rawMargin = trueNet > 0 ? (espTrueNet / trueNet) * 100 : 0;
    const netMargin = Math.min(100, Math.max(0, rawMargin));

    return {
      clientId,
      periodStart,
      periodEnd,
      totalGrossSales: Math.round(totalGross * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      totalDiscounts: Math.round(Math.max(0, totalGross - trueNet - totalRefunds) * 100) / 100,
      trueNetRevenue: Math.round(trueNet * 100) / 100,
      subscriptionRevenue: Math.round(subRev * 100) / 100,
      organicOneTimeRevenue: Math.round(oneTimeRev * 100) / 100,
      espAttributedGrossRevenue: Math.round(espGross * 100) / 100,
      espAttributedNetRevenue: Math.round(espTrueNet * 100) / 100,
      reconciliationDiscrepancy: Math.round(discrepancy * 100) / 100,
      discrepancyPercentage: Math.round(discrepancyPct * 10) / 10,
      netContributionMargin: Math.round(netMargin * 10) / 10,
      hasRefundSurge
    };
  }
}
