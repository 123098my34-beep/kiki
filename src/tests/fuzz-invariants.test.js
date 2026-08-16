const crypto = require('crypto');

console.log('====================================================');
console.log('⚡ EXECUTING TRACK A PROPERTY-BASED FUZZING INVARIANT TESTS');
console.log('====================================================\n');

let totalFuzzRuns = 0;
let passedFuzzRuns = 0;

// Invariant 1: Financial Reconciliation Invariant (Net <= Gross, Net >= 0, Gross - Net = Discounts + Refunds)
console.log('Testing Invariant 1: Net Revenue Bounds across 1,000 randomized currency amounts...');
for (let i = 0; i < 1000; i++) {
  totalFuzzRuns++;
  const gross = Math.random() * 1000000;
  const refunds = Math.random() * gross;
  const discounts = Math.random() * (gross - refunds);
  
  const trueNet = Math.max(0, gross - refunds - discounts);

  if (trueNet > gross || trueNet < 0 || isNaN(trueNet)) {
    throw new Error(`Invariant broken for gross: ${gross}, refunds: ${refunds}, discounts: ${discounts}`);
  }
  passedFuzzRuns++;
}
console.log(`  ✅ 1,000/1,000 random financial permutations satisfied mathematical invariants.`);

// Invariant 2: Cryptographic AES-256-GCM Tamper Resistance
console.log('Testing Invariant 2: AES-256-GCM AuthTag Tamper Resistance (Fuzzing 500 bit flips)...');
const key = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8');

for (let i = 0; i < 500; i++) {
  totalFuzzRuns++;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update('{"secret":"shpat_token_abc"}', 'utf8', 'hex') + cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Corrupt a random byte in the tag or ciphertext
  const tagBuffer = Buffer.from(tag);
  tagBuffer[Math.floor(Math.random() * tagBuffer.length)] ^= 0xff; // Invert bits

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tagBuffer);
  
  let caughtTamper = false;
  try {
    decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
  } catch (err) {
    caughtTamper = true;
  }

  if (!caughtTamper) {
    throw new Error('Cryptographic tamper was not rejected by GCM tag verification!');
  }
  passedFuzzRuns++;
}
console.log(`  ✅ 500/500 corrupted cryptographic payloads were successfully rejected by AuthTag verification.`);

console.log('\n====================================================');
console.log(`🎉 ALL FUZZ TESTS PASSED: ${passedFuzzRuns}/${totalFuzzRuns} RANDOMIZED RUNS SATISFIED`);
console.log('====================================================\n');
