import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || ''
});

export interface MetricBenchmark {
  metricName: string;
  clientValue: number;
  portfolioMedian: number;
  topQuartileThreshold: number;
  percentileRank: number;
  verdict: 'top_performer' | 'above_average' | 'needs_improvement';
}

export class BenchmarkingService {
  /**
   * Evaluates a client store against all other stores managed within the agency
   */
  static async getPortfolioBenchmark(
    tenantId: string,
    targetClientId: string,
    metricType: 'welcome_flow_conversion' | 'abandoned_cart_recovery' | 'campaign_ctor'
  ): Promise<MetricBenchmark> {
    const query = `
      SELECT 
        client_id,
        countIf(event_type = 'placed_order') / nullIf(countIf(event_type = 'received_email'), 0) * 100 as conversion_rate
      FROM events
      WHERE tenant_id = {tenantId:UUID}
        AND flow_id != ''
        AND event_time >= now() - INTERVAL 30 DAY
      GROUP BY client_id
      HAVING countIf(event_type = 'received_email') >= 200
      ORDER BY conversion_rate ASC
    `;

    const result = await clickhouse.query({
      query,
      query_params: { tenantId },
      format: 'JSONEachRow'
    });

    const rows = await result.json<{ client_id: string; conversion_rate: string }>();
    const rates = rows.map(r => parseFloat(r.conversion_rate || '0'));
    
    if (rates.length === 0) {
      return {
        metricName: metricType,
        clientValue: 0,
        portfolioMedian: 0,
        topQuartileThreshold: 0,
        percentileRank: 50,
        verdict: 'above_average'
      };
    }

    const targetRow = rows.find(r => r.client_id === targetClientId);
    const clientVal = targetRow ? parseFloat(targetRow.conversion_rate) : 0;

    const rankIndex = rates.findIndex(val => val >= clientVal);
    const percentile = Math.round(((rankIndex + 1) / rates.length) * 100);

    const median = rates[Math.floor(rates.length * 0.5)];
    const topQuartile = rates[Math.floor(rates.length * 0.75)];

    let verdict: 'top_performer' | 'above_average' | 'needs_improvement' = 'above_average';
    if (percentile >= 75) verdict = 'top_performer';
    else if (percentile < 40) verdict = 'needs_improvement';

    return {
      metricName: metricType.replace(/_/g, ' ').toUpperCase(),
      clientValue: Math.round(clientVal * 100) / 100,
      portfolioMedian: Math.round(median * 100) / 100,
      topQuartileThreshold: Math.round(topQuartile * 100) / 100,
      percentileRank: percentile,
      verdict
    };
  }
}
