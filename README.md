# EscrowPay - Freelance Milestone Escrow Platform

## Problem Statement and Motivation

In today’s freelance industry, there are significant trust issues between clients and developers. The idea for this project originated from the common problems that both sides frequently face in real-world collaborations.

On one hand, freelancers are often at risk of not being paid for their work. Clients may delay payments, refuse to pay after the work is delivered, or disappear altogether after receiving the final product. This creates uncertainty and discourages many skilled developers from working on freelance platforms.

On the other hand, clients also face risks. A freelancer may receive payment but fail to deliver the expected quality of work, miss deadlines, or not complete the project according to the agreed requirements. In such cases, clients lose both time and money without a reliable way to enforce accountability.

Because of these challenges, there is a clear need for a system that protects both parties equally and ensures fairness, transparency, and trust throughout the collaboration process.

## Our Solution

To address these issues, we designed a platform that introduces a structured, milestone-based workflow combined with escrow protection and AI-assisted validation.

## Project Workflow

The system is designed to connect developers and clients in a structured, transparent, and secure way using milestone-based collaboration and blockchain-backed payments.

### 1. Project Creation & Invitation
- Developer creates a new project  
- Developer invites a client via email  
- Client receives the invitation  

### 2. Invitation Handling
- Client can:
  - Accept the invitation → joins the project  
  - Decline the invitation → process ends  

### 3. Communication
- After acceptance, both parties are connected  
- An integrated chat system becomes available  
- Developer and client discuss:
  - Requirements  
  - Expectations  
  - Project scope and progress  

### 4. Requirements & Milestones
- Developer defines project requirements  
- Project is divided into milestones  
- Each milestone includes:
  - Tasks  
  - Acceptance criteria (definition of “done”)  

### 5. Escrow Funding (Blockchain)
- Client funds the project via escrow  
- Payment is secured using MetaMask / blockchain module  
- Funds are locked until milestone approval  

### 6. Development & Submission
- Developer works milestone by milestone  
- For each milestone, developer submits:
  - GitHub repository link  
  - Demo link (if available)  
  - Additional files or documentation  

### 7. Review Process
- Client reviews submitted milestone  
- Client can:
  - Approve → milestone is accepted and payment is released  
  - Decline → milestone is rejected  

### 8. AI-Assisted Dispute Resolution
- If there is disagreement:
  - AI evaluates the milestone  
- AI outcomes:
  - **AI_APPROVED** → payment is released  
  - **AI_REJECTED** → developer must revise and resubmit  

### 9. Project Completion
- Process repeats for all milestones  
- When final milestone is approved:
  - Project status becomes **COMPLETED**  
  - Both client and developer can leave reviews
## Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend (recommended, simplest)**: **Node.js + Express** 
- **Database**: PostgreSQL

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL  
- _(само ако користиш Spring)_ Java 17+ и Maven

### Database
```sql
CREATE DATABASE escrow_db;
```

### Backend (наjедноставно — препорачано)

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
