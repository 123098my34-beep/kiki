import axios from 'axios';
import { ClientPacingSummary, FlowHealthReport } from '../types';

export class SlackBriefingService {
  /**
   * Formats and dispatches the 8:00 AM Morning Briefing to the Account Manager's Slack channel
   */
  static async sendMorningBriefing(
    webhookUrl: string,
    accountManagerName: string,
    portfolioPacing: ClientPacingSummary[],
    decayAlerts: FlowHealthReport[]
  ): Promise<void> {
    const atRiskCount = portfolioPacing.filter(c => c.healthStatus !== 'on_track').length;
    
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `☀️ Morning Retention Briefing — ${accountManagerName}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `You have *${portfolioPacing.length} active accounts*. *${atRiskCount} accounts* are currently pacing below monthly target and require attention today.`
        }
      },
      { type: 'divider' }
    ];

    // Priority Pacing Alerts
    portfolioPacing.filter(c => c.healthStatus !== 'on_track').forEach(c => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${c.clientName}* (${c.healthStatus.toUpperCase()}): MTD *$${c.mtdNetRevenue.toLocaleString()}* (${c.pacingPercentage}% of pace). Needed: *$${Math.round(c.requiredDailyRunRate).toLocaleString()}/day*.`
        }
      });
    });

    // Flow Decay Alerts
    if (decayAlerts.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚨 *Flow Decay & Anomaly Alerts* (${decayAlerts.length} detected):`
        }
      });

      decayAlerts.forEach(alert => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${alert.flowName}*: RPR dropped to *$${alert.revenuePerRecipient}* (Z-Score: \`${alert.rprZScore}\`).\n_${alert.recommendedAction}_`
          }
        });
      });
    }

    await axios.post(webhookUrl, { blocks });
  }
}
