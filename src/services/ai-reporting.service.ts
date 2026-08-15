import { ClientPacingSummary, FlowHealthReport } from '../types';

export class AiReportingService {
  /**
   * Generates C-suite ready narrative summaries comparing pacing, flow decay, and retention metrics
   */
  static generateExecutiveSummary(
    pacing: ClientPacingSummary, 
    flows: FlowHealthReport[]
  ): string {
    const decayingFlows = flows.filter(f => f.decayDetected);
    const topRevenueFlow = [...flows].sort((a, b) => b.revenue - a.revenue)[0];

    const statusDescriptor = pacing.healthStatus === 'on_track' 
      ? 'performing steadily on track' 
      : pacing.healthStatus === 'at_risk' 
      ? 'experiencing minor pacing friction' 
      : 'critically behind target pace';

    let narrative = `### Executive Retention Review for ${pacing.clientName}\n\n`;
    narrative += `**Performance Overview**: Month-to-date revenue sits at **$${pacing.mtdNetRevenue.toLocaleString()}**, representing **${pacing.pacingPercentage}%** of expected pace against the **$${pacing.monthlyTarget.toLocaleString()}** monthly goal (${statusDescriptor}). To achieve target, the required daily revenue run-rate is **$${Math.round(pacing.requiredDailyRunRate).toLocaleString()}/day**.\n\n`;

    if (topRevenueFlow) {
      narrative += `**Top Driver**: ${topRevenueFlow.flowName} generated **$${topRevenueFlow.revenue.toLocaleString()}** with a solid Revenue Per Recipient (RPR) of **$${topRevenueFlow.revenuePerRecipient}** and a **${topRevenueFlow.openRate}%** open rate.\n\n`;
    }

    if (decayingFlows.length > 0) {
      narrative += `**Key Interventions Needed**:\n`;
      decayingFlows.forEach(f => {
        narrative += `- **${f.flowName}**: Showing fatigue with an RPR Z-Score of \`${f.rprZScore}\`. ${f.recommendedAction}\n`;
      });
    } else {
      narrative += `**Flow Health**: All primary automations are operating within normal variance bounds with no statistical fatigue detected.`;
    }

    return narrative;
  }
}
