import { CryptoService } from '../services/crypto.service';
import { ReconciliationService } from '../services/reconciliation.service';
import { DiscountCannibalizationService } from '../services/discount-cannibalization.service';
import { DeliverabilityRadarService } from '../services/deliverability-radar.service';
import { FlowAbOptimizerService } from '../services/flow-ab-optimizer.service';
import { BillingService, AGENCY_TIERS } from '../services/billing.service';

interface TestResult {
  suite: string;
  testName: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  error?: string;
}

export async function runAllTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE PLATFORM TEST SUITE');
  console.log('====================================================\n');

  const results: TestResult[] = [];

  const runTest = async (suite: string, testName: string, fn: () => Promise<void> | void) => {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      results.push({ suite, testName, status: 'PASSED', durationMs });
      console.log(`  ✅ [${suite}] ${testName} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({ suite, testName, status: 'FAILED', durationMs, error: err.message });
      console.error(`  ❌ [${suite}] ${testName} - FAILED: ${err.message}`);
    }
  };

  // Suite 1: Security & Cryptography
  console.log('📦 Suite 1: Cryptographic Token Vaulting (AES-256-GCM)');
  await runTest('Cryptography', 'Encrypts and decrypts OAuth credentials identically', () => {
    const original = { apiKey: 'pk_live_secret123', accountId: 'acc_9988' };
    const vault = CryptoService.encrypt(original);
    if (!vault.encryptedData || !vault.iv || !vault.tag) throw new Error('Missing vault fields');
    const decrypted = CryptoService.decrypt(vault);
    if (decrypted.apiKey !== original.apiKey || decrypted.accountId !== original.accountId) {
      throw new Error('Decrypted payload does not match original');
    }
  });

  // Suite 2: Multi-Tenant Billing
  console.log('\n📦 Suite 2: Stripe Billing & Agency Tier Rules');
  await runTest('Billing', 'Validates agency plan configurations & allowances', () => {
    const starter = AGENCY_TIERS.starter;
    const growth = AGENCY_TIERS.growth;
    const scale = AGENCY_TIERS.scale;
    if (starter.includedClients !== 5 || growth.includedClients !== 15 || scale.includedClients !== 35) {
      throw new Error('Tier client limits misconfigured');
    }
    if (starter.basePriceUsd !== 299 || growth.basePriceUsd !== 599 || scale.basePriceUsd !== 999) {
      throw new Error('Tier base prices misconfigured');
    }
  });

  // Suite 3: Deliverability Radar
  console.log('\n📦 Suite 3: Deliverability Radar & Apple MPP Filters');
  await runTest('Deliverability', 'Computes True Engagement by filtering Apple MPP Ghost Opens', async () => {
    const report = await DeliverabilityRadarService.checkDeliverabilityRadar('00000000-0000-0000-0000-000000000001', 'client_test');
    if (typeof report.domainScore !== 'number' || report.domainScore < 0 || report.domainScore > 100) {
      throw new Error('Invalid domain health score');
    }
    if (!report.remedialActions || report.remedialActions.length === 0) {
      throw new Error('Missing remedial deliverability actions');
    }
  });

  // Suite 4: Discount Cannibalization Analyzer
  console.log('\n📦 Suite 4: Discount Cannibalization & Margin Erosion');
  await runTest('MarginErosion', 'Estimates unneeded discount subsidies on high-intent buyers', async () => {
    const report = await DiscountCannibalizationService.analyzeDiscountCannibalization(
      '00000000-0000-0000-0000-000000000001',
      'client_test',
      '2026-08-01',
      '2026-08-31'
    );
    if (typeof report.estimatedCannibalizedMargin !== 'number') {
      throw new Error('Invalid estimated cannibalized margin');
    }
  });

  // Suite 5: Flow A/B Optimization Engine
  console.log('\n📦 Suite 5: Flow A/B Split Test Significance & Waste');
  await runTest('AbTesting', 'Calculates Bayesian win probability & lost branch waste', async () => {
    const tests = await FlowAbOptimizerService.evaluateFlowSplitTests('00000000-0000-0000-0000-000000000001', 'client_test');
    if (!Array.isArray(tests) || tests.length === 0) throw new Error('Failed to evaluate split tests');
    const t = tests[0];
    if (t.statisticalSignificance < 90 || t.revenueWastedOnLosingBranch <= 0) {
      throw new Error('Statistical significance calculation error');
    }
  });

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${results.length}`);
  console.log('====================================================');

  return { passed, failed, results };
}

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}
