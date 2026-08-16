import json

class PulseApiClient:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    def __init__(self, base_url="http://localhost:4000/api/v1"):
        self.base_url = base_url

    def get_reconciliation_math(self, gross, refunds, sub_rebills, shopify_net):
        true_net_retention = max(0.0, gross - refunds - sub_rebills)
        discrepancy = gross - true_net_retention
        discrepancy_pct = (discrepancy / gross * 100.0) if gross > 0 else 0.0
        net_margin = (true_net_retention / shopify_net * 100.0) if shopify_net > 0 else 0.0
        
        return {
            "gross": gross,
            "refunds": refunds,
            "true_net_retention": round(true_net_retention, 2),
            "discrepancy": round(discrepancy, 2),
            "discrepancy_pct": round(discrepancy_pct, 1),
            "net_margin": round(net_margin, 1)
        }

    def verify_flow_decay_z_score(self, current_rpr, historical_rpr, std_dev):
        z_score = (current_rpr - historical_rpr) / (std_dev if std_dev > 0 else 0.1)
        is_decaying = z_score < -1.8
        return {
            "z_score": round(z_score, 2),
            "decay_detected": is_decaying
        }
