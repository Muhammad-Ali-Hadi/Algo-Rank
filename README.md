# AlgoRank

**Compete. Solve. Rank.**

A modern competitive programming platform — an improved clone of VJudge built with React, Express, and Supabase.

---

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Frontend  | React, Tailwind CSS, Framer Motion  |
| Backend   | Node.js, Express.js                 |
| Database  | Supabase (PostgreSQL)               |
| Auth      | Supabase Auth (Google OAuth)        |

---

## Project Structure

```
Algo-Rank/
├── client/                   # React frontend
│   ├── src/
│   │   ├── animations/       # Animated backgrounds
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   └── services/         # API & Supabase clients
│   └── ...
├── server/                   # Express backend
│   ├── controllers/          # Request handlers
│   ├── middleware/            # Auth & error middleware
│   ├── routes/               # API routes
│   └── services/             # Supabase client
├── schema.sql                # Database schema
└── README.md
```

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `schema.sql` in the Supabase SQL Editor
3. Enable **Google OAuth** in Authentication → Providers
4. Add `http://localhost:5173/auth/callback` to redirect URLs

### 2. Backend

```bash
cd server
cp .env.example .env
# Fill in your Supabase credentials in .env
npm install
npm run dev
```

### 3. Frontend

```bash
cd client
cp .env.example .env
# Fill in your Supabase credentials in .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

### Server (`server/.env`)

| Variable                   | Description                |
| -------------------------- | -------------------------- |
| `PORT`                     | Server port (default 5000) |
| `SUPABASE_URL`             | Supabase project URL       |
| `SUPABASE_ANON_KEY`        | Supabase anon/public key   |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase service role key  |
| `CLIENT_URL`               | Frontend URL               |

### Client (`client/.env`)

| Variable                | Description                |
| ----------------------- | -------------------------- |
| `VITE_SUPABASE_URL`     | Supabase project URL       |
| `VITE_SUPABASE_ANON_KEY`| Supabase anon/public key   |
| `VITE_API_URL`          | Backend API URL            |

---

## Sprint 1 Features

- [x] Google OAuth (sign up / login)
- [x] Session persistence
- [x] Logout with session destruction
- [x] Protected dashboard route
- [x] Animated C++ typing background
- [x] 3D perspective grid background
- [x] Glassmorphism login card
- [x] Skeleton loaders (no spinners)
- [x] Fully responsive layout
- [x] Dark theme