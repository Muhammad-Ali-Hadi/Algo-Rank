# AlgoRank Project Brief

AlgoRank is a modern competitive programming platform (a cleaner VJudge-style clone) built with a React + Tailwind + Framer Motion frontend and a Node/Express backend. It uses Supabase (PostgreSQL) for data storage and Supabase Auth (Google OAuth) for authentication.

## Tech Stack

- Frontend: React (Vite), Tailwind CSS, Framer Motion
- Backend: Node.js, Express.js
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (Google OAuth)

## Structure

- client/: React app with pages, components, animations, hooks, and services
- server/: Express API with routes, controllers, middleware, and Supabase client
- schema.sql: database schema

## Dev Commands

- Client: `cd client && npm install && npm run dev`
- Server: `cd server && npm install && npm run dev`

## Environment Variables

Server (.env):
- PORT
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- CLIENT_URL

Client (.env):
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_URL
