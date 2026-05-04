# AlgoRank 🏆

**Compete. Solve. Rank.**

AlgoRank is a high-performance, premium competitive programming platform designed for the modern era. Inspired by VJudge but reimagined with a sleek, neon-dark aesthetic and robust internal judging, AlgoRank allows users to practice, compete, and climb the global leaderboard.

[**🌐 View Live Platform**](https://also-rank-fast.vercel.app)

---

## ✨ Core Features

### 🔐 Advanced Authentication & Security
- **Email/Password Auth:** Secure login and signup with `bcryptjs` hashing.
- **Email Verification (OTP):** Mandatory OTP verification for new users to ensure valid accounts and prevent bot spam.
- **Verification Persistence:** Verified status is preserved across devices and sessions through secure DB syncing.

### 🏁 Live Contests & High-Speed Judging
- **Global & Local Contests:** Admins can host global events, while users can create private local contests with invite codes.
- **High-Speed Judgment Engine:** Optimized Judge0 integration with **Parallel Test Case Execution** (chunk-based processing) for lightning-fast results.
- **Dynamic Resource Limits:** Problem-specific time and memory limits passed directly to the execution engine.
- **Scoreboard Freeze:** Professional ICPC-style scoreboard freeze and unfreeze logic to maintain suspense in the final hour.

### 📊 Competitive Leaderboards
- **Penalty Logic:** Dynamic penalty calculation (20 mins per wrong attempt).
- **Sub-Minute Tie-breaking:** When scores and penalties are equal, participants are ranked by the actual second they achieved their last solve.
- **Real-time Synchronization:** Leaderboards update automatically to reflect ongoing submissions.

### 🎨 Premium UI/UX
- **Neon-Dark Theme:** A sleek, high-contrast interface designed for long coding sessions.
- **Glassmorphism:** Modern UI components with blur effects and vibrant gradients.
- **Dynamic Backgrounds:** Interactive 3D grids, particle fields, and C++ typing animations.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Framer Motion, Vanilla CSS (Custom Design System) |
| **Backend** | Node.js, Express.js, JWT (JsonWebToken) |
| **Database** | Supabase (PostgreSQL) |
| **Judging** | Judge0 API (Parallel execution engine) |
| **Email** | Nodemailer (Gmail SMTP with App Passwords) |
| **Caching** | Client-side API caching with automatic mutation invalidation |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Supabase Project
- Gmail account (for OTP service)
- Judge0 API credentials

### 2. Database Setup
Run the `schema.sql` file in your Supabase SQL Editor. This will set up the `users`, `contests`, `submissions`, and `problems` tables.

### 3. Server Configuration
```bash
cd server
npm install
```
Create a `.env` file (this file is ignored by git for security):
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=https://also-rank-fast.vercel.app
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_TIMEOUT=5
```

### 4. Client Configuration
```bash
cd client
npm install
```
Create a `.env` file:
```env
VITE_API_URL=https://your-backend-url.com
```

### 5. Run Local Development
```bash
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Client
cd client && npm run dev
```

---

## 📂 Project Structure

```bash
Algo-Rank/
├── client/                   # React Frontend
│   ├── src/
│   │   ├── animations/       # Framer Motion backgrounds
│   │   ├── components/       # Reusable UI (Navbar, Cards, Modals)
│   │   ├── services/         # API Layer (with cache invalidation)
│   │   └── pages/            # View components
├── server/                   # Node.js Backend
│   ├── controllers/          # Business logic (Ranking, Contests)
│   ├── services/             # Judge0 & Email services
│   └── routes/               # API endpoints
└── schema.sql                # Database schema
```

---

## 🛡️ Security & Performance
- **Parallel Judgment:** Reduces judgment latency by up to 80% compared to sequential execution.
- **Cache Invalidation:** Smart frontend cache that automatically clears on POST/PUT/DELETE to ensure data consistency.
- **Resource Limits:** Explicit stack and memory limit capping (128MB stack) for Judge0 compatibility.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

**AlgoRank** — Built with ❤️ for the CP community.
