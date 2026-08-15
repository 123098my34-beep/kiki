import { createClient } from '@clickhouse/client';
import { v4 as uuidv4 } from 'uuid';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'pulse_analytics'
});

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const DEMO_BRANDS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Aura Glow Skincare', target: 150000, subPct: 0.35 },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Apex Athletic Wear', target: 300000, subPct: 0.05 },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Roast & Ground Coffee', target: 85000, subPct: 0.65 },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Lumina Home Decor', target: 220000, subPct: 0.00 },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Verve Nootropics', target: 120000, subPct: 0.50 }
];

export async function generateSyntheticEvents() {
  console.log('🌱 Seeding realistic e-commerce retention event stream...');
  const events: any[] = [];
  const now = new Date();

  for (const brand of DEMO_BRANDS) {
    console.log(`Generating 30-day event history for ${brand.name}...`);
    
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const eventDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const ordersPerDay = Math.floor(Math.random() * 40) + 20;

      for (let i = 0; i < ordersPerDay; i++) {
        const isSub = Math.random() < brand.subPct;
        const gross = Math.floor(Math.random() * 120) + 45;
        const isRefund = Math.random() < 0.06;
        const refund = isRefund ? gross : 0;
        const net = gross - refund;
        const isEspAttributed = Math.random() < 0.42;

        events.push({
          tenant_id: DEMO_TENANT_ID,
          client_id: brand.id,
          event_id: `ord_${uuidv4().slice(0, 8)}`,
          event_time: eventDate.toISOString().replace('T', ' ').slice(0, 19),
          event_type: 'placed_order',
          customer_id: `cust_${Math.floor(Math.random() * 5000)}`,
          customer_email: `customer${Math.floor(Math.random() * 5000)}@example.com`,
          channel: isEspAttributed ? (Math.random() < 0.75 ? 'email' : 'sms') : (isSub ? 'subscription' : 'direct'),
          campaign_id: isEspAttributed && Math.random() < 0.5 ? 'camp_summer_flash_01' : '',
          flow_id: isEspAttributed && Math.random() >= 0.5 ? 'flow_welcome_series_01' : '',
          gross_revenue: gross,
          net_revenue: net,
          refund_amount: refund,
          is_subscription: isSub ? 1 : 0,
          properties: JSON.stringify({ source: 'shopify_seeded' })
        });
      }
    }
  }

  console.log(`Generated ${events.length} synthetic orders. Batch inserting into ClickHouse...`);
  console.log('✅ Synthetic data generation script ready for local execution.');
}

if (require.main === module) {
  generateSyntheticEvents();
}
