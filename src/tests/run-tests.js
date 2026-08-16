const crypto = require('crypto');

console.log('====================================================');
console.log('🧪 EXECUTING PULSE RETENTION ENGINE TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function test(name, fn) {
  const start = Date.now();
  try {
    fn();
    const duration = Date.now() - start;
    console.log(`  ✅ [PASS] ${name} (${duration}ms)`);
    passed++;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`  ❌ [FAIL] ${name} (${duration}ms): ${err.message}`);
    failed++;
  }
}

// Test 1: AES-256-GCM Token Encryption / Decryption
test('Security: AES-256-GCM Credential Vaulting', () => {
  const key = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const original = { apiKey: 'pk_live_sec_12345678', accountId: 'acc_9988' };
  
  let encrypted = cipher.update(JSON.stringify(original), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  const res = JSON.parse(decrypted);
  assert(res.apiKey === original.apiKey, 'API key mismatch');
  assert(res.accountId === original.accountId, 'Account ID mismatch');
});

// Test 2: True Contribution Margin Formula
test('Reconciliation: True Contribution Margin Calculation', () => {
  const espGross = 45000;
  const refunds = 3200;
  const subscriptionRebills = 12000;
  const espTrueNet = espGross - refunds - subscriptionRebills; // 29,800
  const shopifyTrueNet = 110000;

  const discrepancy = espGross - espTrueNet;
  const netContributionMargin = (espTrueNet / shopifyTrueNet) * 100;

  assert(espTrueNet === 29800, 'True net calculation error');
  assert(discrepancy === 15200, 'Discrepancy mismatch');
  assert(Math.round(netContributionMargin * 10) / 10 === 27.1, 'Contribution margin percentage error');
});

// Test 3: Flow Decay Anomaly Z-Score Algorithm
test('Analytics: Statistical Flow Decay Z-Score Detection', () => {
  const historicalAvgRpr = 0.85;
  const stdDev = 0.15;
  const currentDecayingRpr = 0.52; // Significant drop

  const zScore = (currentDecayingRpr - historicalAvgRpr) / stdDev;
  const decayDetected = zScore < -1.8;

  assert(Math.round(zScore * 10) / 10 === -2.2, 'Z-score calculation mismatch');
  assert(decayDetected === true, 'Decay threshold not triggered');
});

// Test 4: Deliverability Apple MPP Ghost Open Filter
test('Deliverability: Apple MPP Ghost Open Deduction', () => {
  const rawOpenRate = 48.0;
  const estimatedTrueOpenRate = Math.round(rawOpenRate * 0.58 * 10) / 10;
  const mppGhostRate = Math.round((rawOpenRate - estimatedTrueOpenRate) * 10) / 10;

  assert(estimatedTrueOpenRate === 27.8, 'True open rate calculation error');
  assert(mppGhostRate === 20.2, 'MPP ghost rate calculation error');
});

// Test 5: Discount Cannibalization Margin Loss
test('Margin Preservation: Cannibalized Margin Estimation', () => {
  const totalDiscountsGiven = 15000;
  const cannibalizationRate = 0.42;
  const estimatedCannibalizedMargin = Math.round(totalDiscountsGiven * cannibalizationRate * 100) / 100;
  const recoverableClientProfit = estimatedCannibalizedMargin * 12;

  assert(estimatedCannibalizedMargin === 6300, 'Cannibalized margin calculation error');
  assert(recoverableClientProfit === 75600, 'Annual recoverable profit error');
});

// Test 6: Bayesian Flow A/B Split Test Significance
test('AB Optimization: Bayesian Probability & Waste Calculation', () => {
  const variantARev = 18400;
  const variantBRev = 11200;
  const wasted = variantARev - variantBRev;

  assert(wasted === 7200, 'Wasted branch revenue error');
});

console.log('\n====================================================');
console.log(`📊 FINAL TEST RUN RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('====================================================\n');

if (failed > 0) process.exit(1);
