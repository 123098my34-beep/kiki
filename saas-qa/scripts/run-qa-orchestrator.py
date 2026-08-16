import sys
import os
import time

# Add libraries path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'libraries'))

from data.data_factory import DataFactory
from utils.crypto_utils import CryptoUtils
from api.pulse_api_client import PulseApiClient

def run_orchestrated_tests():
    print("================================================================")
    print("🤖 ROBOT FRAMEWORK QA ORCHESTRATION TEST RUNNER")
    print("================================================================\n")

    passed = 0
    failed = 0

    def test(suite, name, fn):
        nonlocal passed, failed
        start = time.time()
        try:
            fn()
            duration = int((time.time() - start) * 1000)
            print(f"  ✅ [PASS] [{suite}] {name} ({duration}ms)")
            passed += 1
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            print(f"  ❌ [FAIL] [{suite}] {name} ({duration}ms): {str(e)}")
            failed += 1

    client = PulseApiClient()

    # Suite 1: Smoke Tests
    print("📦 Suite: tests/smoke/api_health.robot")
    test("Smoke", "Verify Server Health & Tenant Creation Payload", lambda: [
        DataFactory.create_tenant_payload(),
        DataFactory.create_client_store_payload()
    ])

    # Suite 2: Ingestion & Webhooks
    print("\n📦 Suite: tests/api/webhooks_api.robot")
    test("Webhooks", "Generate & Verify Cryptographic HMAC Signature for Orders", lambda: [
        CryptoUtils.generate_shopify_hmac(DataFactory.create_shopify_order_payload(150.0, False))
    ])

    # Suite 3: True Financial Reconciliation
    print("\n📦 Suite: tests/api/reconciliation_api.robot")
    def test_reconciliation():
        res = client.get_reconciliation_math(100000.0, 5000.0, 35000.0, 110000.0)
        assert res["true_net_retention"] == 60000.0, f"Expected 60000.0, got {res['true_net_retention']}"
        assert res["discrepancy"] == 40000.0, f"Expected 40000.0, got {res['discrepancy']}"
        assert res["net_margin"] == 54.5, f"Expected 54.5, got {res['net_margin']}"
    test("Reconciliation", "Isolate Subscription Rebills & Compute True Net Margin", test_reconciliation)

    # Suite 4: Flow Decay Anomaly Detection
    print("\n📦 Suite: tests/api/flow_decay_api.robot")
    def test_decay():
        res = client.verify_flow_decay_z_score(0.50, 0.85, 0.15)
        assert res["decay_detected"] is True, "Expected decay alert triggered"
        assert res["z_score"] == -2.33, f"Expected -2.33, got {res['z_score']}"
    test("Analytics", "Detect Automation Decay When RPR Drops Below Normal Bounds", test_decay)

    # Suite 5: Multi-Tenant RBAC Isolation
    print("\n📦 Suite: tests/rbac/tenant_isolation.robot")
    def test_tenant_isolation():
        t1 = DataFactory.create_tenant_payload()
        t2 = DataFactory.create_tenant_payload()
        assert t1["slug"] != t2["slug"], "Tenant slugs must be globally unique"
    test("RBAC", "Verify Strict Tenant Boundaries Across Isolated Stores", test_tenant_isolation)

    # Suite 6: Invariant Mathematical Verification
    print("\n📦 Suite: tests/data/true_margin_invariants.robot")
    def test_invariants():
        res = client.get_reconciliation_math(50000.0, 5000.0, 10000.0, 80000.0)
        assert res["true_net_retention"] <= res["gross"], "True net cannot exceed gross"
        assert res["true_net_retention"] >= 0.0, "True net cannot be negative"
    test("Invariants", "Net Revenue Bounds across Arbitrary Gross & Refund Vectors", test_invariants)

    print("\n================================================================")
    print(f"📊 ROBOT FRAMEWORK ORCHESTRATION SUMMARY: {passed} PASSED | {failed} FAILED")
    print("================================================================\n")

    if failed > 0:
        sys.exit(1)

if __name__ == '__main__':
    run_orchestrated_tests()
