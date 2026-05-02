# AlgoRank Project Brief 🚀

AlgoRank is a premium competitive programming platform built to provide a high-end experience for problem-solving and live contests. It bridges the gap between practice and competition with real-time judging and advanced leaderboard mechanics.

## 🛠️ Tech Stack

- **Frontend:** React 18 (Vite), Vanilla CSS (Custom Design System), Framer Motion
- **Backend:** Node.js, Express.js, JWT Authentication
- **Database:** Supabase (PostgreSQL)
- **Email:** Nodemailer (Gmail SMTP)
- **Judging:** Judge0 API

## 🏛️ Project Architecture

- **client/**: Responsive React application featuring:
  - **animations/**: 3D perspective grids and particle animations.
  - **components/**: Modular UI (LoginCard, Navbar, Leaderboard).
  - **pages/**: Core views (Dashboard, Contests, Profile, Verification).
  - **services/**: API integration layer.
- **server/**: Secure REST API featuring:
  - **controllers/**: Business logic for Auth, Contests, and Judging.
  - **middleware/**: Security layers for Admin, Auth, and Email Verification.
  - **services/**: Integration with Email and Supabase.
- **schema.sql**: Complete database schema and migrations.

## ⚙️ Core Functionalities

1.  **Security First:** Custom Email/Password auth with mandatory OTP verification.
2.  **Live Contests:** Support for Global and Local (private) contests.
3.  **Real-time Leaderboard:** Accurate score tracking with 20-minute penalty logic and scoreboard freeze.
4.  **Integrated Judging:** Direct code submission to Judge0 for instant feedback.
5.  **History & Profile:** Detailed contest history and customizable profile settings.

## 🚀 Quick Start

- **Client:** `cd client && npm install && npm run dev` (Runs on port 5173)
- **Server:** `cd server && npm install && npm run dev` (Runs on port 5000)

## 🔑 Required Environment Variables

### Server:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `EMAIL_USER`, `EMAIL_PASS` (Gmail App Password)
- `JUDGE0_API_URL`

### Client:
- `VITE_API_URL`
