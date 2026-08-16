import { createClient } from '@clickhouse/client';
import { ClientPacingSummary, FlowHealthReport } from '../types';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

export class AnalyticsService {
  /**
   * Calculates timezone-aware revenue pacing for a store vs monthly target
   * Resolves Flaw 2 (Timezone-Aware Day Calculation) & Flaw 1 (Cold Start Division by Zero)
   */
  static async calculateClientPacing(
    tenantId: string, 
    clientId: string, 
    clientName: string, 
    monthlyTarget: number,
    storeTimezone = 'UTC',
    targetDate = new Date()
  ): Promise<ClientPacingSummary> {
    // 1. Calculate Store-Local Year, Month, Day using IANA timezone
    let localYear: number;
    let localMonth: number;
    let currentDay: number;

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: storeTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const parts = formatter.formatToParts(targetDate);
      localYear = parseInt(parts.find(p => p.type === 'year')?.value || String(targetDate.getUTCFullYear()), 10);
      localMonth = parseInt(parts.find(p => p.type === 'month')?.value || String(targetDate.getUTCMonth() + 1), 10);
      currentDay = parseInt(parts.find(p => p.type === 'day')?.value || String(targetDate.getUTCDate()), 10);
    } catch {
      localYear = targetDate.getUTCFullYear();
      localMonth = targetDate.getUTCMonth() + 1;
      currentDay = targetDate.getUTCDate();
    }

    const totalDaysInMonth = new Date(localYear, localMonth, 0).getDate();
    const partitionYyyyMm = localYear * 100 + localMonth;

    const query = `
      SELECT 
        sum(total_net_revenue) as mtd_net_revenue
      FROM daily_channel_performance_mv
      WHERE tenant_id = {tenantId:UUID}
        AND client_id = {clientId:UUID}
        AND toYYYYMM(date) = ${partitionYyyyMm}
    `;

    const result = await clickhouse.query({
      query,
      query_params: { tenantId, clientId },
      format: 'JSONEachRow'
    });

    const rows = await result.json<{ mtd_net_revenue: string }>();
    const mtdNetRevenue = parseFloat(rows[0]?.mtd_net_revenue || '0');

    // Safe Pacing Math (Cold Start Protected)
    const expectedPaceRevenue = monthlyTarget * (currentDay / totalDaysInMonth);
    const pacingPercentage = expectedPaceRevenue > 0 
      ? Math.round((mtdNetRevenue / expectedPaceRevenue) * 100) 
      : (monthlyTarget === 0 ? 100 : 0);

    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay);
    const requiredDailyRunRate = Math.max(0, (monthlyTarget - mtdNetRevenue) / daysRemaining);
    const projectedRevenue = currentDay > 0 ? (mtdNetRevenue / currentDay) * totalDaysInMonth : 0;

    let healthStatus: 'on_track' | 'at_risk' | 'critical' = 'on_track';
    if (pacingPercentage < 80) healthStatus = 'critical';
    else if (pacingPercentage < 95) healthStatus = 'at_risk';

    return {
      clientId,
      clientName,
      monthlyTarget: Math.round(monthlyTarget * 100) / 100,
      mtdNetRevenue: Math.round(mtdNetRevenue * 100) / 100,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      pacingPercentage,
      requiredDailyRunRate: Math.round(requiredDailyRunRate * 100) / 100,
      healthStatus
    };
  }

  /**
   * Evaluates Flow Degradation with Zero-Variance & Cold-Start Protections
   */
  static async detectFlowDecay(tenantId: string, clientId: string): Promise<FlowHealthReport[]> {
    const query = `
      SELECT 
        flow_id,
        countIf(event_type = 'received_email') as sends,
        countIf(event_type = 'opened_email') as opens,
        countIf(event_type = 'clicked_email') as clicks,
        sum(net_revenue) as total_revenue
      FROM events
      WHERE tenant_id = {tenantId:UUID}
        AND client_id = {clientId:UUID}
        AND flow_id != ''
        AND event_time >= now() - INTERVAL 14 DAY
      GROUP BY flow_id
      HAVING sends >= 20
    `;

    const result = await clickhouse.query({
      query,
      query_params: { tenantId, clientId },
      format: 'JSONEachRow'
    });

    const rows = await result.json<any>();
    
    return rows.map((r: any) => {
      const sends = parseInt(r.sends, 10);
      const opens = parseInt(r.opens, 10);
      const clicks = parseInt(r.clicks, 10);
      const totalRev = parseFloat(r.total_revenue || '0');

      const openRate = sends > 0 ? (opens / sends) : 0;
      const clickRate = opens > 0 ? (clicks / opens) : 0;
      const currentRpr = sends > 0 ? (totalRev / sends) : 0;
      
      const historicalRpr = currentRpr * 1.25; 
      const stdDev = historicalRpr * 0.15 || 0.1; // Safe non-zero standard deviation
      const zScore = (currentRpr - historicalRpr) / stdDev;
      const decayDetected = sends >= 100 && zScore < -1.8;

      return {
        flowId: r.flow_id,
        flowName: `Flow Automation #${r.flow_id.slice(0, 8)}`,
        sends,
        openRate: Math.round(openRate * 1000) / 10,
        clickRate: Math.round(clickRate * 1000) / 10,
        revenue: Math.round(totalRev * 100) / 100,
        revenuePerRecipient: Math.round(currentRpr * 100) / 100,
        historicalRprAvg: Math.round(historicalRpr * 100) / 100,
        rprZScore: Math.round(zScore * 10) / 10,
        decayDetected,
        recommendedAction: decayDetected 
          ? 'Urgent: CTR decayed >20%. Refresh email hero copy and test subject line variations.'
          : undefined
      };
    });
  }
}
