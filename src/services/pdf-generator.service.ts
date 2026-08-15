import { ClientPacingSummary, FlowHealthReport } from '../types';
import { ReconciliationReport } from './reconciliation.service';
import { MetricBenchmark } from './benchmarking.service';

export class PdfGeneratorService {
  /**
   * Generates a structured executive client slide deck (HTML format ready for PDF rendering)
   */
  static generateExecutiveDeckHtml(
    agencyName: string,
    pacing: ClientPacingSummary,
    reconciliation: ReconciliationReport,
    benchmark: MetricBenchmark,
    flows: FlowHealthReport[],
    aiExecutiveSummary: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Retention Deck - ${pacing.clientName}</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #ffffff; }
    .slide { page-break-after: always; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 25px 0; }
    .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
    .metric { font-size: 28px; font-weight: 700; color: #4338ca; margin-top: 5px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #e0e7ff; color: #3730a3; }
    .narrative { background: #f1f5f9; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 4px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
  </style>
</head>
<body>

  <!-- Slide 1: Executive Overview & Pacing -->
  <div class="slide">
    <div class="header">
      <div>
        <div class="title">${pacing.clientName} — Retention Executive Briefing</div>
        <div style="color: #64748b; font-size: 14px;">Prepared by ${agencyName}</div>
      </div>
      <div class="badge">${pacing.healthStatus.toUpperCase()} (${pacing.pacingPercentage}% OF PACE)</div>
    </div>

    <div class="grid">
      <div class="card">
        <div style="font-size: 12px; color: #64748b;">MTD Net Retention Sales</div>
        <div class="metric">$${reconciliation.espAttributedNetRevenue.toLocaleString()}</div>
      </div>
      <div class="card">
        <div style="font-size: 12px; color: #64748b;">True Retention Contribution</div>
        <div class="metric">${reconciliation.netContributionMargin}%</div>
      </div>
      <div class="card">
        <div style="font-size: 12px; color: #64748b;">Required Daily Run Rate</div>
        <div class="metric">$${Math.round(pacing.requiredDailyRunRate).toLocaleString()}/day</div>
      </div>
    </div>

    <div class="narrative">
      <strong>Strategic Executive Summary:</strong><br>
      ${aiExecutiveSummary.replace(/\n/g, '<br>')}
    </div>
  </div>

  <!-- Slide 2: Automation Health & Anomaly Diagnostics -->
  <div class="slide">
    <div class="header">
      <div class="title">Automation Flow Health & Optimization Roadmap</div>
      <div style="color: #64748b; font-size: 14px;">14-Day Rolling Diagnostics</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Automation Name</th>
          <th>Sends</th>
          <th>Open Rate</th>
          <th>Click Rate</th>
          <th>Revenue</th>
          <th>RPR</th>
          <th>Health Status</th>
        </tr>
      </thead>
      <tbody>
        ${flows.map(f => `
          <tr>
            <td><strong>${f.flowName}</strong></td>
            <td>${f.sends.toLocaleString()}</td>
            <td>${f.openRate}%</td>
            <td>${f.clickRate}%</td>
            <td>$${f.revenue.toLocaleString()}</td>
            <td>$${f.revenuePerRecipient}</td>
            <td>${f.decayDetected ? '<span style="color: #dc2626; font-weight: 600;">⚠️ Decaying</span>' : '<span style="color: #16a34a; font-weight: 600;">✅ Stable</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

</body>
</html>
`;
  }
}
