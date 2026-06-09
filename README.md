# EscrowPay - Freelance Milestone Escrow Platform

## Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend (recommended, simplest)**: **Node.js + Express** 
- **Database**: PostgreSQL

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
- PostgreSQL  
- _(само ако користиш Spring)_ Java 17+ и Maven

### Database
```sql
CREATE DATABASE escrow_db;
```

### Backend (найедноставно — препорачано)

Копијај конфигурација и промени postgres password:

```bash
cd backend-node
copy .env.example .env
# Измени DATABASE_URL или password во `.env`

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
