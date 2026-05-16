# EscrowPay - Freelance Milestone Escrow Platform

## Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend (recommended, simplest)**: **Node.js + Express** → `backend-node` (нема Maven)
- **Backend (alternate)**: Spring Boot 3 во `backend` (има потреба од Maven/Java)
- **Database**: Embedded **pg-mem** by default (no install). Optional real **PostgreSQL** with `USE_REAL_POSTGRES=true`.

## Project Flow
1. Developer creates a project and invites client (by email)
2. Client accepts/declines the invitation
3. Chat between developer and client
4. Developer defines requirements
5. Developer creates milestones with acceptance criteria
6. Client funds escrow (MetaMask / blockchain - separate module)
7. Developer submits each milestone (GitHub, demo link, files)
8. Client reviews: Approve → payment released | Decline → AI review
9. AI decision: AI_APPROVED → payment released | AI_REJECTED → developer fixes
10. When all milestones complete → Project COMPLETED → Reviews

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL **optional** — default Node backend uses in-memory **pg-mem** (no DB server).
- _(само ако користиш Spring)_ Java 17+ и Maven

### Database

**Default:** nothing to install — `npm start` in `backend-node` uses pg-mem (data is cleared when the server stops).

**Optional PostgreSQL:** `CREATE DATABASE escrow_db;`, then set `USE_REAL_POSTGRES=true` in `backend-node/.env` plus `DATABASE_URL` or `PG*` variables.

### Backend (найедноставно — препорачано)

Копијај `.env` и пушти го серверот (postgres не е потребен по подразбирање):

```bash
cd backend-node
copy .env.example .env

npm install
npm start
```

Подразбирање: API на **`http://127.0.0.1:8081`** (`backend-node/.env` → `PORT`). Frontend го зема истото од **`frontend/.env.development`** → `VITE_API_URL`.

### Backend (Spring — ако има Maven)

```bash
cd backend
# application.properties → DB credentials
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Phantom wallet + devnet SOL test

After you log in, open **`http://localhost:5173/wallet-playground`**.

1. In Phantom: enable **Developer Settings → Testnet Mode → Devnet**, and fund the wallet with a [devnet faucet](https://faucet.solana.com/).
2. Click **Connect** in the app header (or on the playground page).
3. Paste a **recipient** devnet address and an amount (e.g. `0.01` SOL), then **Send on devnet** and approve in Phantom.

**Escrow flow (chat, approvals, AI review, on-chain release):** after login, open **`http://localhost:5173/escrow-flow`** or use the **Escrow** tab in the nav. Connect Phantom as the **business** wallet on **Devnet** to sign **0.01 SOL** transfers.

This repo was cloned from GitHub: [SandraaaaD/Blockchain](https://github.com/SandraaaaD/Blockchain.git).

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register (CLIENT or DEVELOPER)
- `POST /api/auth/login` - Login → returns JWT

### Projects
- `GET /api/projects` - Get my projects
- `POST /api/projects` - Create project (DEVELOPER)
- `GET /api/projects/:id` - Get project detail
- `POST /api/projects/:id/respond?accept=true/false` - Accept/decline invite (CLIENT)
- `PUT /api/projects/:id/requirements` - Update requirements (DEVELOPER)
- `POST /api/projects/:id/milestones` - Add milestone (DEVELOPER)
- `POST /api/projects/:id/fund` - Mark as funded (CLIENT)

### Milestones
- `POST /api/projects/milestones/:id/submit` - Submit milestone (DEVELOPER)
- `POST /api/projects/milestones/:id/review?approved=true/false` - Review (CLIENT)
- `POST /api/projects/milestones/:id/ai-decision?approved=true/false` - AI decision (internal)

### Chat
- `GET /api/projects/:id/messages` - Get messages
- `POST /api/projects/:id/messages` - Send message (supports file upload)

### Reviews
- `POST /api/projects/:id/reviews` - Submit review

---

## Integration with Blockchain Escrow
The `fund` endpoint and `ai-decision` endpoint are designed to be called by the blockchain module:
- When client funds via MetaMask → call `POST /api/projects/:id/fund`
- When AI decision is made → call `POST /api/projects/milestones/:id/ai-decision?approved=true/false&feedback=...`
