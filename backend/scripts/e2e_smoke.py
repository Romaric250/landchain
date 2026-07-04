"""End-to-end smoke test against a locally running API (dev mode).

Exercises: login, KYC submit + admin approval, parcel registration,
duplicate-registration rejection, listing payment via mock Fapshi + webhook,
subscription purchase + webhook, and the full verification report.

Usage: python scripts/e2e_smoke.py
"""

import sys
import time

import httpx

BASE = "http://localhost:8000"
ADMIN = {"email": "admin@landchain.app", "password": "ChangeMe123!"}
CITIZEN = {"email": "citizen@test.cm", "password": "password123"}

checks: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, info: str = "") -> None:
    checks.append((name, ok, info))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def login(client: httpx.Client, creds: dict) -> str:
    r = client.post(f"{BASE}/auth/login", json=creds)
    r.raise_for_status()
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    client = httpx.Client(timeout=30)

    admin_token = login(client, ADMIN)
    citizen_token = login(client, CITIZEN)
    check("login (admin + citizen)", True)

    # --- KYC ---
    r = client.get(f"{BASE}/kyc/status", headers=auth(citizen_token))
    kyc_status = r.json()["kyc_status"]
    if kyc_status == "not_started":
        r = client.post(
            f"{BASE}/kyc/submit",
            headers=auth(citizen_token),
            json={
                "id_document_url": "https://example.com/id-front.jpg",
                "selfie_url": "https://example.com/selfie.jpg",
            },
        )
        check("KYC submit", r.status_code == 201, str(r.json()))
        time.sleep(1)  # allow AI precheck background task
    if kyc_status != "verified":
        r = client.get(f"{BASE}/admin/kyc/pending", headers=auth(admin_token))
        pending = r.json()["items"]
        if pending:
            sid = pending[0]["id"]
            r = client.post(
                f"{BASE}/admin/kyc/{sid}/approve",
                headers=auth(admin_token),
                json={"notes": "smoke test approval"},
            )
            check("admin KYC approve", r.status_code == 200, str(r.json()))

    # --- Parcel registration ---
    ref = f"LT-SMOKE-{int(time.time())}"
    parcel_body = {
        "parcel_reference": ref,
        "geojson": {"type": "Point", "coordinates": [9.7679, 4.0511]},
        "region": "Littoral",
        "area_sqm": 500,
        "document_ids": [],
    }
    r = client.post(f"{BASE}/parcels", headers=auth(citizen_token), json=parcel_body)
    check("parcel registration", r.status_code == 201, ref)
    parcel_id = r.json()["id"]

    # --- Duplicate detection: same reference ---
    r = client.post(f"{BASE}/parcels", headers=auth(citizen_token), json=parcel_body)
    check("duplicate reference rejected (409)", r.status_code == 409, r.json()["detail"].get("reason", ""))

    # --- Duplicate detection: overlapping location, different reference ---
    dup = dict(parcel_body, parcel_reference=ref + "-B")
    r = client.post(f"{BASE}/parcels", headers=auth(citizen_token), json=dup)
    check("geo overlap rejected (409)", r.status_code == 409, r.json()["detail"].get("reason", ""))

    # --- Public quick verify ---
    r = client.get(f"{BASE}/verify/quick", params={"ref": ref})
    check("public quick verify", r.json().get("found") is True, r.json().get("status", ""))

    # --- Listing payment (mock Fapshi) + webhook ---
    r = client.post(
        f"{BASE}/parcels/{parcel_id}/list-for-sale",
        headers=auth(citizen_token),
        json={"price_xaf": 15_000_000},
    )
    check("list-for-sale initiates payment", r.status_code == 200, r.json().get("trans_id", ""))
    trans_id = r.json()["trans_id"]

    r = client.post(
        f"{BASE}/payments/webhook",
        headers={"x-wh-secret": "mock-secret"},
        json={"transId": trans_id, "status": "SUCCESSFUL", "amount": 5000},
    )
    check("listing webhook applied", r.json().get("applied") is True)

    # Idempotency: replay the same webhook
    r = client.post(
        f"{BASE}/payments/webhook",
        headers={"x-wh-secret": "mock-secret"},
        json={"transId": trans_id, "status": "SUCCESSFUL", "amount": 5000},
    )
    check("webhook replay is idempotent", r.json().get("applied") is False)

    # Bad secret rejected
    r = client.post(
        f"{BASE}/payments/webhook",
        headers={"x-wh-secret": "wrong"},
        json={"transId": trans_id, "status": "SUCCESSFUL"},
    )
    check("webhook bad secret rejected (403)", r.status_code == 403)

    r = client.get(f"{BASE}/parcels?for_sale=true", )
    listed = any(p["parcel_reference"] == ref for p in r.json()["items"])
    check("parcel visible in marketplace", listed)

    # --- Subscription + full verification report ---
    r = client.post(f"{BASE}/payments/subscribe", headers=auth(citizen_token), json={"plan": "monthly"})
    sub_trans = r.json()["trans_id"]
    client.post(
        f"{BASE}/payments/webhook",
        headers={"x-wh-secret": "mock-secret"},
        json={"transId": sub_trans, "status": "SUCCESSFUL", "amount": 2000},
    )
    r = client.post(f"{BASE}/parcels/{parcel_id}/verify", headers=auth(citizen_token))
    check("full verification report (subscribed)", r.status_code == 200, r.json().get("verdict", ""))

    # --- Admin dashboard ---
    r = client.get(f"{BASE}/admin/dashboard", headers=auth(admin_token))
    check("admin dashboard metrics", r.status_code == 200, f"users={r.json().get('total_users')}")

    r = client.get(f"{BASE}/admin/logs", headers=auth(admin_token))
    check("admin audit logs recorded", r.json()["total"] >= 1, f"entries={r.json()['total']}")

    failed = [c for c in checks if not c[1]]
    print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
