# LandChain

Blockchain-powered land registration and verification platform for Cameroon — fighting forged titles, duplicate sales and identity fraud with an immutable ledger (Polygon), AI document authentication, and human-in-the-loop review.

## Repository layout

| Folder | Stack | Notes |
|---|---|---|
| `backend/` | FastAPI (Python 3.11+), Motor/MongoDB, Pydantic v2 | Runs in a virtual env (`backend/venv`) or Docker |
| `frontend/` | Next.js (App Router), TypeScript, Tailwind CSS v4, next-intl | Bilingual (EN default / FR), fully responsive, no Docker |

## Quick start

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Needs MongoDB reachable at `MONGO_URI` (default `mongodb://localhost:27017/landchain`).
Easiest: `docker compose up mongo` from `backend/`, or use the full compose stack:

```bash
cd backend && docker compose up --build
```

A super admin is seeded on first startup (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` in `.env`,
default `admin@landchain.app` / `ChangeMe123!`). API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — routes are locale-prefixed (`/en/...`, `/fr/...`).

## Dev-mode integrations

Every third-party integration degrades gracefully when unconfigured, so the
whole product is testable locally with zero external accounts:

- **Fapshi** → mock checkout page (`/mock-checkout`) that fires the payment webhook
- **Resend** → emails logged to the backend console
- **UploadThing** → any https URL accepted as a file URL
- **Polygon** → record hashes computed/stored; on-chain anchoring backfills later
- **AI pipeline** → deterministic stub verdicts feeding the admin review queues

See `backend/README.md` for full backend documentation, **`backend/DEPLOY.md`** for Contabo production deploy, and
`backend/contracts/LandRegistry.sol` for the smart contract.
