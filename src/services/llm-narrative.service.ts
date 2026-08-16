import axios from 'axios';
import { ClientPacingSummary, FlowHealthReport } from '../types';

export interface StructuredAiBriefing {
  executiveHeadline: string;
  overallHealthStatus: 'on_track' | 'at_risk' | 'critical';
  confidenceScore: number;
  keyRevenueWins: string[];
  decayWarnings: string[];
  tacticalActionItems: Array<{
    automationName: string;
    suggestedAction: string;
    priority: 'high' | 'medium' | 'low';
    estimatedRecoveryRevenue: number;
  }>;
}

export class LlmNarrativeService {
  /**
   * Generates AI-synthesized executive narratives using structured JSON output
   */
  static async generateStructuredBriefing(
    pacing: ClientPacingSummary,
    flows: FlowHealthReport[],
    apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
  ): Promise<StructuredAiBriefing> {
    const decayingFlows = flows.filter(f => f.decayDetected);
    const topFlow = [...flows].sort((a, b) => b.revenue - a.revenue)[0];

    // If no live API key is configured, fallback deterministically with structured format
    if (!apiKey || apiKey.startsWith('sk_test_mock')) {
      return {
        executiveHeadline: `${pacing.clientName} is ${pacing.pacingPercentage}% to target with $${pacing.mtdNetRevenue.toLocaleString()} MTD net sales.`,
        overallHealthStatus: pacing.healthStatus,
        confidenceScore: 0.94,
        keyRevenueWins: topFlow ? [`${topFlow.flowName} drove $${topFlow.revenue.toLocaleString()} (RPR: $${topFlow.revenuePerRecipient})`] : [],
        decayWarnings: decayingFlows.map(f => `${f.flowName} CTR dropped below threshold (Z-Score: ${f.rprZScore})`),
        tacticalActionItems: decayingFlows.map(f => ({
          automationName: f.flowName,
          suggestedAction: f.recommendedAction || 'Test new subject line and CTA button',
          priority: 'high',
          estimatedRecoveryRevenue: Math.round(f.revenue * 0.25)
        }))
      };
    }

    // Live LLM Pipeline call
    try {
      const prompt = `Analyze retention pacing for ${pacing.clientName}. Target: $${pacing.monthlyTarget}, MTD: $${pacing.mtdNetRevenue}. Decaying flows: ${JSON.stringify(decayingFlows)}`;
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are an expert retention CMO. Produce a valid JSON briefing with keys: executiveHeadline, overallHealthStatus, confidenceScore, keyRevenueWins, decayWarnings, tacticalActionItems.' },
            { role: 'user', content: prompt }
          ]
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      return JSON.parse(res.data.choices[0].message.content);
    } catch (err: any) {
      console.warn('[LLM Service] Fallback to deterministic briefing:', err.message);
      return this.generateStructuredBriefing(pacing, flows, undefined);
    }
  }
}
