const { execSync } = require('child_process');

console.log('====================================================');
console.log('🎭 SIMULATING 5 IMAGINARY CUSTOMER JOURNEYS & USAGE');
console.log('====================================================\n');

const personas = [
  {
    id: 1,
    name: 'Velocity Retention Agency (Marcus, Founder - 28 Clients)',
    profile: 'Mid-sized agency managing 28 Klaviyo/Shopify accounts with 5 Account Managers.',
    primaryWorkflow: 'Daily 8:00 AM Slack Briefings + 1-Click Monthly Executive PDF Decks for client Zoom reviews.',
    simulatedData: { clients: 28, mtdRevenue: 1420000, hoursSavedWeekly: 45 },
    feedback: {
      good: 'Automated 8 AM Slack digests completely eliminated AM morning dashboard hopping. Client decks generate in 10 seconds.',
      bad: 'Wants multi-user permission tiers so junior AMs only see their 6 assigned accounts instead of all 28.'
    }
  },
  {
    id: 2,
    name: 'Kroma Skincare (Elena, Head of Retention - High Subscription Blend)',
    profile: 'DTC Beauty brand doing $350k/mo with 45% recurring subscriptions on Recharge.',
    primaryWorkflow: 'True Contribution Margin Reconciliation & Subscription De-biasing.',
    simulatedData: { monthlyGross: 350000, rechargeRebills: 157500, espGrossClaim: 140000, espTrueNet: 72000 },
    feedback: {
      good: 'Finally exposed that $68k of Klaviyo attributed revenue was actually passive Recharge rebills, establishing CFO trust.',
      bad: 'Wants cohort predictive churn warnings specific to 3rd vs 4th recurring subscription billing cycles.'
    }
  },
  {
    id: 3,
    name: 'Apex Apparel Group (Liam, VP of Growth - High Discount Velocity)',
    profile: 'Fast-fashion DTC brand doing $800k/mo, heavily discounting in Welcome & Cart flows.',
    primaryWorkflow: 'Discount Cannibalization & Margin Erosion Analyzer.',
    simulatedData: { totalDiscounts: 112000, cannibalizedMargin: 47040, recoverableAnnualProfit: 564480 },
    feedback: {
      good: 'Discovered that 42% of abandoned cart discounts were taken by users who would have purchased at full price within 2 hours.',
      bad: 'Needs automated webhook trigger to delay discount code popups for return visitors with high cart value.'
    }
  },
  {
    id: 4,
    name: 'Northstar Media (Chloe, Solo Retention Consultant - 6 Clients)',
    profile: 'Freelance email strategist managing 6 7-figure brands on Starter tier.',
    primaryWorkflow: 'Flow Decay Anomaly Detection & Cross-Portfolio Benchmarking.',
    simulatedData: { activeFlows: 34, decayingFlowsCaught: 3, benchmarkPercentile: 82 },
    feedback: {
      good: 'Caught a decaying Post-Purchase Upsell flow (Z = -2.1) before the client even looked at the analytics.',
      bad: 'The UI currently requires manual CNAME setup for custom branding; wants an automated instant shareable URL.'
    }
  },
  {
    id: 5,
    name: 'Vitality Supplements (Arjun, Omnichannel Brand CMO - Klaviyo + SMS + Meta Ads)',
    profile: 'Health brand running heavy Meta acquisition ($90k/mo) + Postscript SMS & Klaviyo email.',
    primaryWorkflow: 'Blended MER & LTV:CAC Engine + Bi-Directional Klaviyo Sync.',
    simulatedData: { adSpend: 90000, totalNet: 310000, blendedMer: 3.44, ltvToCac: 3.8 },
    feedback: {
      good: 'One-click synced 1,420 churn-risk customers directly into a Klaviyo VIP Winback SMS flow.',
      bad: 'Wants automated daily ingestion of Meta Ads API tokens rather than manual spend input.'
    }
  }
];

personas.forEach(p => {
  console.log(`👤 Customer #${p.id}: ${p.name}`);
  console.log(`   • Profile: ${p.profile}`);
  console.log(`   • Key Workflow: ${p.primaryWorkflow}`);
  console.log(`   • What Delighted Them (The Good): ${p.feedback.good}`);
  console.log(`   • Friction / Gaps Found (The Bad): ${p.feedback.bad}\n`);
});

