import uuid
import random

class DataFactory:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @staticmethod
    def unique_name(prefix="qa"):
        return f"{prefix}-{uuid.uuid4().hex[:8]}"

    @staticmethod
    def create_tenant_payload(plan="growth"):
        return {
            "name": DataFactory.unique_name("Agency-Portfolio"),
            "slug": DataFactory.unique_name("agency-slug"),
            "plan_tier": plan,
            "currency": "USD",
            "timezone": "America/New_York"
        }

    @staticmethod
    def create_client_store_payload(target_revenue=100000.0):
        return {
            "name": DataFactory.unique_name("Brand-Store"),
            "store_url": f"https://{DataFactory.unique_name('store')}.myshopify.com",
            "currency": "USD",
            "timezone": "America/New_York",
            "monthly_revenue_target": target_revenue
        }

    @staticmethod
    def create_shopify_order_payload(gross=150.0, is_subscription=False, refund=0.0):
        order_id = random.randint(100000, 999999)
        return {
            "id": order_id,
            "order_number": f"#{order_id}",
            "total_price": str(gross),
            "total_refunded": str(refund),
            "created_at": "2026-08-16T12:00:00Z",
            "customer": {
                "id": random.randint(1000, 9999),
                "email": f"buyer_{order_id}@qa-example.com"
            },
            "line_items": [
                {
                    "id": 1,
                    "price": str(gross),
                    "selling_plan_allocation": {"id": 123} if is_subscription else None
                }
            ]
        }
