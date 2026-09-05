# 🕸️ TrustMesh

**An explainable fraud-risk and agentic-commerce safety layer for merchants.**

TrustMesh detects coordinated abuse rings from relationship data, scores risk transparently, and issues a bounded, time-limited **TrustPass** that governs whether a customer or AI shopping agent may proceed with checkout, needs step-up verification, or requires human review — with every decision traceable back to the exact signal that caused it.

Built for **Track 02: AI Risk Manager**.

---

## Why TrustMesh

Modern fraud and abuse rarely happens in isolation — coordinated rings share devices, coupons, and refund destinations across dozens of seemingly unrelated accounts. Most fraud tools give you a black-box score. TrustMesh is built around a different premise: **every decision should be explainable enough to defend to a customer, a merchant, and a regulator.**

As autonomous shopping agents become more common, merchants also need a way to grant *bounded* trust to an AI agent acting on a customer's behalf — not a binary allow/deny, but a scoped authorization with a spending cap, an expiry, and a clear reason. That's what a TrustPass is.

---

## Architecture

```
Customer / Agent Checkout
        │
        ▼
   Risk Engine  ──────────────► weighted score across 6 features (D·R·V·C·B·F)
        │
        ▼
  Policy Engine ──────────────► tiered decision (ALLOW / STEP_UP / HOLD / DENY)
        │
        ▼
   TrustPass    ──────────────► bounded, time-limited, privacy-safe authorization
        │
        ▼
  Razorpay (test mode) ───────► payment gated by TrustPass limits, server-verified
        │
        ▼
   Neo4j Graph  ──────────────► rings, entities, audit trail — all queryable
        │
        ▼
  Analyst Review ─────────────► human-in-the-loop for HOLD / DENY / escalations
```

Every stage writes to a central **audit log**, so any decision — automated or human — can be reconstructed after the fact.

---

## Core Features

### 🔍 Explainable Risk Scoring
Six weighted features, each independently computed and shown in the final breakdown — never a single opaque number:

| Feature | Signal | Weight |
|---|---|---|
| **D** | Device/account concentration | 0.25 |
| **R** | Refund-destination reuse | 0.20 |
| **V** | Order velocity vs. account age | 0.15 |
| **C** | Coupon-abuse concentration | 0.15 |
| **B** | Confirmed ring association | 0.15 |
| **F** | Abnormal refund frequency | 0.10 |

### 🛡️ Tiered Policy Engine
Risk tiers (`low` / `medium` / `high` / `critical`) map to bounded actions — `ALLOW`, `STEP_UP_REQUIRED`, `HOLD_FOR_REVIEW`, `DENY_AUTONOMOUS_ACTION` — each with an explicit allowed/blocked action list and human-readable reason codes.

### 🎫 TrustPass
A privacy-safe, time-limited authorization object issued per checkout — exposes only the bounded decision (spending cap, coupon cap, expiry, allowed actions), never raw risk internals.

### 🕵️ Fraud Ring Detection
NetworkX connected-components analysis over a customer-customer graph (edges = shared device, coupon, or refund destination), with detected rings persisted back into Neo4j and explorable via a live graph UI — nodes, relationships, hubs, and per-entity inspection.

### 👤 Analyst Workflow
A live Alert Queue backed by Neo4j: every checkout evaluation creates a case with risk score, exposure, top reasons, and a recommended action. Analysts can **Allow / Request OTP / Hold / Escalate / Mark as Abuse / Mark False Positive**, with each action logged to the audit trail.

### 💳 Real Payment Gating (Razorpay Test Mode)
Checkout is gated end-to-end: TrustPass limits are enforced server-side against the actual payment amount. Tampering with the payment amount client-side is detected and blocked — verified in testing.

### 📊 Live Dashboard & Metrics
Real-time GMV, order volume, active rings, open alerts, exposure, risk-tier distribution, and evaluation metrics (precision/recall/F1/confusion matrix), all computed from the live graph rather than mock data.

---

## Tech Stack

**Frontend:** Vite · React · TypeScript · react-router-dom · Tailwind CSS v4 · Recharts

**Backend:** FastAPI · Python 3.13 · Pydantic v2

**Graph Database:** Neo4j AuraDB (Free tier) · NetworkX for ring detection

**Payments:** Razorpay (test mode)

---

## Getting Started

### Prerequisites
- Python 3.13
- Node.js + npm
- A Neo4j AuraDB instance (free tier works)
- Razorpay test-mode API keys

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
pip install pip-system-certs # Windows only — fixes SSL cert interception issues

# create backend/.env with:
# NEO4J_URI=neo4j+s://<your-instance-id>.databases.neo4j.io
# NEO4J_USERNAME=<your-instance-id>
# NEO4J_PASSWORD=<your-password>
# RAZORPAY_KEY_ID=<your-test-key>
# RAZORPAY_KEY_SECRET=<your-test-secret>

uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`, interactive docs at `/docs`.

### Frontend

```bash
cd trustmesh
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Generate Synthetic Data

Once the backend is running, seed the graph with synthetic accounts, orders, and planted fraud rings:

```bash
curl -X POST http://127.0.0.1:8000/simulation/generate
```

This generates 2,478 events (1,233 accounts, 1,233 orders, 12 refunds) including deliberately planted abuse rings for demo and evaluation purposes.

---

## Evaluation

On the 18-case synthetic labeled dataset:

| Metric | Result |
|---|---|
| Precision | 100% |
| Recall | 100% |
| F1 | 100% |
| False Positive Rate | 0% |
| Accuracy | 100% |

**Note:** these numbers reflect performance on the labeled development set used during threshold tuning. Held-out evaluation on unseen cases is the natural next step to validate generalization beyond the dataset the system was tuned against.

---

## Project Structure

```
trustmesh/
├── src/                        # React frontend
│   ├── components/              # Sidebar, TopBar, shared UI
│   ├── pages/                   # Dashboard, Alerts, CaseDetail, RingExplorer,
│   │                             # AgentCheckout, PolicyStudio, TrustPassRegistry, Metrics
│   └── App.tsx
└── backend/
    └── app/
        ├── routers/              # HTTP layer — events, simulation, checkout,
        │                         # alerts, rings, trustpasses, policies, dashboard, metrics
        ├── schemas/              # Pydantic request/response models
        └── services/             # Business logic — risk_scoring, policy_engine,
                                   # trustpass, ring_detection, analyst_actions,
                                   # audit_log, razorpay_client, metrics
```

---


## License

Built for hackathon purposes. License TBD.