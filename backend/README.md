# LandChain Backend (FastAPI)

Blockchain-powered land registration and verification API for Cameroon.

## Stack

- **FastAPI** (Python 3.11+) with **Motor** (async MongoDB) + **Pydantic v2**
- JWT auth (access token + rotating httpOnly refresh cookie)
- **Fapshi** payments (MTN MoMo / Orange Money) — mock checkout mode in dev
- **Resend** transactional email (EN/FR) — logged to console in dev
- **Polygon** anchoring via web3.py (optional; see `contracts/LandRegistry.sol`)
- AI document verification pipeline (stub in dev, `AI_MODEL_ENDPOINT` in prod)
- APScheduler worker: subscription/listing expiry + renewal reminder emails

## Local development (virtual env)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
copy .env.example .env         # then edit values
uvicorn app.main:app --reload --port 8000
```

Requires a MongoDB instance (local `mongod`, Docker, or Atlas) reachable at `MONGO_URI`.

Swagger docs: http://localhost:8000/docs (development only).

A super admin account is seeded at first startup from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

## Docker (local test)

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Starts the API on **port 8095**, plus worker, MongoDB 7, and Redis 7.

- Local API: http://localhost:8095
- Swagger (development only): http://localhost:8095/docs — requires `ENV=development` in `.env`

## Production deploy (Contabo VPS)

**Full step-by-step guide:** [DEPLOY.md](./DEPLOY.md)

Summary:

- Domain: `https://api.lanchain.land` → your Contabo server IP (DNS A record)
- SSH: `ssh root@YOUR_SERVER_IP` (Contabo account panel: [my.contabo.com](https://my.contabo.com))
- Run `docker compose up -d` on the server, Nginx + Certbot for HTTPS
- Frontend on Vercel → `NEXT_PUBLIC_API_BASE_URL=https://api.lanchain.land`


When credentials are not configured, integrations degrade gracefully so every
flow is testable end to end:

| Integration | Dev behaviour |
|---|---|
| Fapshi | Mock checkout — `initiate-pay` returns a link to the frontend's `/mock-checkout` page, which fires the webhook with `x-wh-secret: mock-secret` |
| Resend | Emails logged to the console |
| UploadThing | Any https URL accepted as a file URL |
| Polygon | Record hashes computed and stored; `tx_hash` stays null for later backfill |
| AI pipeline | Deterministic heuristic verdicts (~80% authentic / 15% suspicious / 5% fraudulent) |

## Smart contract

`contracts/LandRegistry.sol` — minimal ERC-721 registry (OpenZeppelin). Deploy
with Hardhat to Polygon, then set `POLYGON_RPC_URL`,
`LANDREGISTRY_CONTRACT_ADDRESS`, `DEPLOYER_PRIVATE_KEY` and uncomment `web3`
in `requirements.txt`.

## Tests

```bash
venv\Scripts\python.exe -m pytest app/tests -q
```

venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
