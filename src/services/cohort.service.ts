import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

export interface CohortRow {
  cohortMonth: string; // e.g. "2026-01"
  initialCustomers: number;
  initialRevenue: number;
  retentionRates: number[]; // Month 0 (100%), Month 1, Month 2, ...
  cumulativeLtv: number[];  // LTV at Month 0, Month 1, Month 2, ...
}

export class CohortService {
  /**
   * Generates a true customer cohort retention matrix excluding recurring subscription renewals
   */
  static async getCohortRetentionMatrix(
    tenantId: string,
    clientId: string,
    lookbackMonths = 6
  ): Promise<CohortRow[]> {
    const query = `
      WITH first_orders AS (
        SELECT
          customer_id,
          min(event_time) as first_order_time,
          toYYYYMM(min(event_time)) as cohort_month_num,
          formatDateTime(min(event_time), '%Y-%m') as cohort_month
        FROM events
        WHERE tenant_id = {tenantId:UUID}
          AND client_id = {clientId:UUID}
          AND event_type = 'placed_order'
          AND is_subscription = 0
        GROUP BY customer_id
      ),
      customer_orders AS (
        SELECT
          e.customer_id,
          f.cohort_month,
          dateDiff('month', toDate(f.first_order_time), toDate(e.event_time)) as month_index,
          e.net_revenue
        FROM events e
        INNER JOIN first_orders f ON e.customer_id = f.customer_id
        WHERE e.tenant_id = {tenantId:UUID}
          AND e.client_id = {clientId:UUID}
          AND e.event_type = 'placed_order'
          AND e.is_subscription = 0
      )
      SELECT
        cohort_month,
        month_index,
        uniqExact(customer_id) as active_customers,
        sum(net_revenue) as month_revenue
      FROM customer_orders
      WHERE month_index >= 0 AND month_index <= 12
      GROUP BY cohort_month, month_index
      ORDER BY cohort_month ASC, month_index ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { tenantId, clientId },
      format: 'JSONEachRow'
    });

    const rows = await result.json<any>();
    const cohortMap = new Map<string, { initialCust: number; revMap: Map<number, number>; custMap: Map<number, number> }>();

    for (const r of rows) {
      const month = r.cohort_month;
      const idx = parseInt(r.month_index, 10);
      const custCount = parseInt(r.active_customers, 10);
      const rev = parseFloat(r.month_revenue || '0');

      if (!cohortMap.has(month)) {
        cohortMap.set(month, { initialCust: 0, revMap: new Map(), custMap: new Map() });
      }

      const entry = cohortMap.get(month)!;
      if (idx === 0) entry.initialCust = custCount;
      entry.custMap.set(idx, custCount);
      entry.revMap.set(idx, rev);
    }

    const cohortRows: CohortRow[] = [];
    for (const [month, data] of cohortMap.entries()) {
      const initialCust = data.initialCust || 1;
      const retentionRates: number[] = [];
      const cumulativeLtv: number[] = [];
      let runningLtv = 0;

      for (let i = 0; i <= lookbackMonths; i++) {
        const activeInMonth = data.custMap.get(i) || 0;
        const revInMonth = data.revMap.get(i) || 0;
        
        runningLtv += revInMonth / initialCust;
        retentionRates.push(Math.round((activeInMonth / initialCust) * 1000) / 10);
        cumulativeLtv.push(Math.round(runningLtv * 100) / 100);
      }

      cohortRows.push({
        cohortMonth: month,
        initialCustomers: initialCust,
        initialRevenue: Math.round((data.revMap.get(0) || 0) * 100) / 100,
        retentionRates,
        cumulativeLtv
      });
    }

    return cohortRows;
  }
}
