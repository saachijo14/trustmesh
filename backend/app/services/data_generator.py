"""
Synthetic data generator for TrustMesh.

Produces a deterministic but richer dataset containing:
- large normal background activity
- coupon/device abuse ring
- refund-destination abuse ring
- legitimate shared-household cluster

The larger background dataset is intended to make dashboard,
metrics, and trend visualizations more representative.
"""

import random
import hashlib
from datetime import datetime, timedelta

from faker import Faker


fake = Faker()

SEED = 42
random.seed(SEED)
Faker.seed(SEED)


def _hash(value: str) -> str:
    """Simulate a privacy-safe hash for PII-like fields."""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def _customer_id(i: int) -> str:
    return f"customer_{1000 + i}"


def generate_normal_events(
    n: int = 1200,
    start: datetime = None,
):
    """
    Generate normal background activity.

    Each customer receives one account and one order.
    Activity is spread across August 2026 to create
    a meaningful time-series distribution.
    """

    start = start or datetime(2026, 8, 1, 9, 0, 0)

    events = []

    for i in range(n):
        cust_id = _customer_id(i)

        # Spread activity across ~30 days.
        created_at = start + timedelta(
            minutes=random.randint(0, 60 * 24 * 30)
        )

        device = _hash(fake.uuid4())
        ip = _hash(fake.ipv4())
        phone = _hash(fake.phone_number())

        events.append(
            {
                "type": "account_created",
                "customer_id": cust_id,
                "phone_hash": phone,
                "device_hash": device,
                "ip_hash": ip,
                "created_at": created_at.isoformat(),
            }
        )

        order_time = created_at + timedelta(
            minutes=random.randint(5, 720)
        )

        # More realistic distribution than a completely
        # uniform order value.
        amount = round(
            random.choice(
                [
                    random.uniform(300, 1500),
                    random.uniform(1500, 4000),
                    random.uniform(4000, 8000),
                    random.uniform(8000, 15000),
                ]
            ),
            2,
        )

        events.append(
            {
                "type": "order_created",
                "order_id": f"order_{5000 + i}",
                "customer_id": cust_id,
                "amount": amount,
                "coupon_code": None,
                "address_hash": _hash(fake.address()),
                "payment_ref_hash": _hash(
                    fake.credit_card_number()
                ),
                "timestamp": order_time.isoformat(),
            }
        )

    return events


def generate_ring_a(start: datetime = None):
    """
    Ring A: coupon abuse + shared devices + burst
    account creation.

    15 accounts share two devices and repeatedly
    redeem the same coupon.
    """

    start = start or datetime(2026, 8, 12, 22, 0, 0)

    events = []

    shared_devices = [
        _hash("ring_a_device_1"),
        _hash("ring_a_device_2"),
    ]

    coupon = "SAVE40"

    for i in range(15):
        cust_id = f"ringA_customer_{i}"

        created_at = start + timedelta(
            minutes=random.randint(0, 90)
        )

        device = shared_devices[i % 2]
        ip = _hash("ring_a_shared_ip")
        phone = _hash(fake.phone_number())

        events.append(
            {
                "type": "account_created",
                "customer_id": cust_id,
                "phone_hash": phone,
                "device_hash": device,
                "ip_hash": ip,
                "created_at": created_at.isoformat(),
            }
        )

        order_time = created_at + timedelta(
            minutes=random.randint(2, 20)
        )

        events.append(
            {
                "type": "order_created",
                "order_id": f"order_ringA_{i}",
                "customer_id": cust_id,
                "amount": round(
                    random.uniform(1500, 8000),
                    2,
                ),
                "coupon_code": coupon,
                "address_hash": _hash(fake.address()),
                "payment_ref_hash": _hash(
                    fake.credit_card_number()
                ),
                "timestamp": order_time.isoformat(),
            }
        )

    return events


def generate_ring_b(start: datetime = None):
    """
    Ring B: refund-destination convergence.

    12 accounts use different devices/addresses,
    but refunds converge on two destinations.
    """

    start = start or datetime(2026, 8, 18, 14, 0, 0)

    events = []

    shared_refund_dest = [
        _hash("ring_b_refund_dest_1"),
        _hash("ring_b_refund_dest_2"),
    ]

    for i in range(12):
        cust_id = f"ringB_customer_{i}"

        created_at = start + timedelta(
            hours=random.randint(0, 72)
        )

        events.append(
            {
                "type": "account_created",
                "customer_id": cust_id,
                "phone_hash": _hash(fake.phone_number()),
                "device_hash": _hash(fake.uuid4()),
                "ip_hash": _hash(fake.ipv4()),
                "created_at": created_at.isoformat(),
            }
        )

        order_id = f"order_ringB_{i}"

        order_time = created_at + timedelta(
            minutes=random.randint(10, 300)
        )

        events.append(
            {
                "type": "order_created",
                "order_id": order_id,
                "customer_id": cust_id,
                "amount": round(
                    random.uniform(2000, 12000),
                    2,
                ),
                "coupon_code": None,
                "address_hash": _hash(fake.address()),
                "payment_ref_hash": _hash(
                    fake.credit_card_number()
                ),
                "timestamp": order_time.isoformat(),
            }
        )

        refund_time = order_time + timedelta(
            hours=random.randint(1, 48)
        )

        events.append(
            {
                "type": "refund_requested",
                "order_id": order_id,
                "refund_id": f"refund_ringB_{i}",
                "refund_amount": round(
                    random.uniform(1500, 10000),
                    2,
                ),
                "refund_ref_hash": shared_refund_dest[
                    i % 2
                ],
                "reason": random.choice(
                    [
                        "item_not_as_described",
                        "changed_mind",
                        "damaged",
                    ]
                ),
                "timestamp": refund_time.isoformat(),
            }
        )

    return events


def generate_legitimate_household(start: datetime = None):
    """
    Legitimate shared-household cluster.

    Six customers share an address but have distinct
    devices and payment methods.
    """

    start = start or datetime(2026, 8, 5, 10, 0, 0)

    events = []

    shared_address = _hash(
        "household_shared_address"
    )

    for i in range(6):
        cust_id = f"household_customer_{i}"

        # Keep all household activity inside the
        # dashboard's August 2026 period.
        created_at = start + timedelta(
            days=random.randint(0, 20),
            hours=random.randint(0, 12),
        )

        events.append(
            {
                "type": "account_created",
                "customer_id": cust_id,
                "phone_hash": _hash(fake.phone_number()),
                "device_hash": _hash(fake.uuid4()),
                "ip_hash": _hash(fake.ipv4()),
                "created_at": created_at.isoformat(),
            }
        )

        order_time = created_at + timedelta(
            days=random.randint(1, 5)
        )

        events.append(
            {
                "type": "order_created",
                "order_id": f"order_household_{i}",
                "customer_id": cust_id,
                "amount": round(
                    random.uniform(500, 3000),
                    2,
                ),
                "coupon_code": None,
                "address_hash": shared_address,
                "payment_ref_hash": _hash(
                    fake.credit_card_number()
                ),
                "timestamp": order_time.isoformat(),
            }
        )

    return events


def generate_full_dataset():
    """
    Combine all scenarios into one richer deterministic dataset.
    """

    events = []

    events += generate_normal_events(1200)
    events += generate_ring_a()
    events += generate_ring_b()
    events += generate_legitimate_household()

    random.shuffle(events)

    return events


if __name__ == "__main__":
    data = generate_full_dataset()

    print(f"Generated {len(data)} events")
    print("  Normal: 2,400 (1,200 accounts + 1,200 orders)")
    print("  Ring A: 30 (15 accounts + 15 orders)")
    print("  Ring B: 36 (12 accounts + 12 orders + 12 refunds)")
    print("  Household: 12 (6 accounts + 6 orders)")