export interface NormalizedEvent {
  tenantId: string;
  clientId: string;
  eventId: string;
  eventTime: string; // ISO 8601
  eventType: 
    | 'placed_order' 
    | 'received_email' 
    | 'opened_email' 
    | 'clicked_email' 
    | 'sms_sent' 
    | 'sms_clicked' 
    | 'refund_issued' 
    | 'subscription_renewed';
  customerId: string;
  customerEmail: string;
  channel: 'email' | 'sms' | 'direct' | 'subscription';
  campaignId?: string;
  flowId?: string;
  grossRevenue: number;
  netRevenue: number;
  refundAmount: number;
  isSubscription: boolean;
  properties: Record<string, any>;
}

export interface ClientPacingSummary {
  clientId: string;
  clientName: string;
  monthlyTarget: number;
  mtdNetRevenue: number;
  projectedRevenue: number;
  pacingPercentage: number;
  requiredDailyRunRate: number;
  healthStatus: 'on_track' | 'at_risk' | 'critical';
}

export interface FlowHealthReport {
  flowId: string;
  flowName: string;
  sends: number;
  openRate: number;
  clickRate: number;
  revenue: number;
  revenuePerRecipient: number;
  historicalRprAvg: number;
  rprZScore: number;
  decayDetected: boolean;
  recommendedAction?: string;
}
