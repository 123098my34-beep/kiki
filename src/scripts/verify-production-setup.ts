import { createClient } from '@clickhouse/client';
import Redis from 'ioredis';
import Stripe from 'stripe';
import { loadConfig } from '../config/env.config';

const config = loadConfig();

export async function runDiagnostics(): Promise<boolean> {
  console.log('====================================================');
  console.log('🔍 RUNNING PRODUCTION SYSTEM DIAGNOSTICS');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Test Redis Connectivity
  try {
    const redis = new Redis(config.redisUrl, { connectTimeout: 3000, maxRetriesPerRequest: 1 });
    await redis.ping();
    console.log('✅ Redis Cache & Idempotency Buffer: CONNECTED');
    await redis.quit();
  } catch (err: any) {
    console.log(`⚠️  Redis Connection: ${err.message}`);
    allPassed = false;
  }

  // 2. Test ClickHouse Connectivity
  try {
    const ch = createClient({
      host: config.clickhouse.host,
      username: config.clickhouse.user,
      password: config.clickhouse.password
    });
    const result = await ch.query({ query: 'SELECT 1 as ping' });
    const json = await result.json<any>();
    if (json[0]?.ping === 1) {
      console.log('✅ ClickHouse OLAP Cluster: CONNECTED');
    }
  } catch (err: any) {
    console.log(`⚠️  ClickHouse Connection: ${err.message}`);
    allPassed = false;
  }

  // 3. Test Stripe Configuration
  try {
    const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2024-06-20' as any });
    if (config.stripe.secretKey.startsWith('sk_live_')) {
      console.log('✅ Stripe Integration: LIVE MODE DETECTED');
    } else {
      console.log('ℹ️  Stripe Integration: TEST MODE DETECTED');
    }
  } catch (err: any) {
    console.log(`⚠️  Stripe Configuration: ${err.message}`);
    allPassed = false;
  }

  // 4. Test Partner Secrets
  if (config.shopify.apiKey && config.shopify.apiSecret) {
    console.log('✅ Shopify App Credentials: CONFIGURED');
  } else {
    console.log('⚠️  Shopify App Credentials: MISSING');
    allPassed = false;
  }

  if (config.klaviyo.clientId && config.klaviyo.clientSecret) {
    console.log('✅ Klaviyo OAuth 2.0 Credentials: CONFIGURED');
  } else {
    console.log('⚠️  Klaviyo OAuth 2.0 Credentials: MISSING');
    allPassed = false;
  }

  console.log('\n====================================================');
  console.log(allPassed ? '🎉 SYSTEM READY FOR PRODUCTION TRAFFIC' : '⚠️  SOME OPTIONAL VARIABLES NEED POPULATION BEFORE LAUNCH');
  console.log('====================================================');

  return allPassed;
}

if (require.main === module) {
  runDiagnostics();
}
