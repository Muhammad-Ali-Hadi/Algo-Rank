# AlgoRank 🏆

**Compete. Solve. Rank.**

AlgoRank is a high-performance, premium competitive programming platform designed for the modern era. Inspired by VJudge but reimagined with a sleek, neon-dark aesthetic and robust internal judging, AlgoRank allows users to practice, compete, and climb the global leaderboard.

!Live: (algo-rank-fast.vercel.app)

---

## ✨ Core Features

### 🔐 Advanced Authentication & Security
- **Email/Password Auth:** Secure login and signup with `bcryptjs` hashing.
- **Email Verification (OTP):** Mandatory OTP verification for new users to ensure valid accounts and prevent bot spam.
- **Password Recovery:** Fully automated "Forgot Password" flow with secure 6-digit OTP delivery via Gmail SMTP.

### 🏁 Live Contests & Judging
- **Global & Local Contests:** Admins can host global events, while users can create private local contests with invite codes.
- **Judge0 Integration:** Real-time code execution and judging for multiple languages (C++, Python, Java) using the Judge0 API.
- **Scoreboard Freeze:** Professional ICPC-style scoreboard freeze and unfreeze logic to maintain suspense in the final hour.
- **First Blood 🩸:** Visual distinction for the first person to solve a problem in a contest.

### 📊 Competitive Leaderboards
- **Penalty Logic:** Dynamic penalty calculation (20 mins per wrong attempt) and tie-breaking based on submission time.
- **Contest History:** Detailed participation history for every user, showing rank, score, and problems solved.

### 🎨 Premium UI/UX
- **Neon-Dark Theme:** A sleek, high-contrast interface designed for long coding sessions.
- **Glassmorphism:** Modern UI components with blur effects and vibrant gradients.
- **Dynamic Backgrounds:** Interactive 3D grids, particle fields, and C++ typing animations.
- **Skeleton Loaders:** Seamless loading states for a snappy, fluid experience.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Framer Motion, Vanilla CSS (Custom Design System) |
| **Backend** | Node.js, Express.js, JWT (JsonWebToken) |
| **Database** | Supabase (PostgreSQL) |
| **Judging** | Judge0 API (Code Execution) |
| **Email** | Nodemailer (Gmail SMTP with App Passwords) |
| **Caching** | Node-Cache (Optimized Leaderboards & Problem Sets) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Supabase Project
- Gmail account (for OTP service)

### 2. Database Setup
Run the `schema.sql` file in your Supabase SQL Editor. This will set up the `users`, `contests`, `submissions`, and `problems` tables with the necessary relationships.

### 3. Server Configuration
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
JUDGE0_API_URL=https://ce.judge0.com
```

### 4. Client Configuration
```bash
cd client
npm install
```
Create a `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:5000
```

### 5. Run the Application
```bash
# In server directory
npm run dev

# In client directory
npm run dev
```

---

## 📂 Project Structure

```bash
Algo-Rank/
├── client/                   # React Frontend
│   ├── src/
│   │   ├── animations/       # Framer Motion backgrounds
│   │   ├── components/       # Reusable UI (Navbar, Cards, Modals)
│   │   ├── hooks/            # Auth & State hooks
│   │   ├── pages/            # View components (Dashboard, Contests, Profile)
│   │   ├── services/         # API Layer (Axios/Fetch wrappers)
│   │   └── utils/            # Formatting & logic helpers
├── server/                   # Node.js Backend
│   ├── controllers/          # Business logic (Auth, Contests, Problems)
│   ├── middleware/           # Auth, Admin, and Verification guards
│   ├── routes/               # API endpoints
│   ├── services/             # Third-party integrations (Supabase, Email)
│   └── index.js              # Server entry point
└── schema.sql                # Database migrations
```

---

## 🛡️ Security & Performance
- **Rate Limiting:** Protects auth and submission endpoints from brute-force and spam.
- **IPv4 Forcing:** Optimized SMTP connection to prevent `ENETUNREACH` timeouts.
- **Cache TTL:** Submission results and leaderboards are cached (30s) to reduce Supabase load.
- **Avatar Optimization:** Base64 avatar uploads with 5MB payload support and 1MB frontend validation.

---

## 🤝 Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

**AlgoRank** — Built with ❤️ for the CP community.
