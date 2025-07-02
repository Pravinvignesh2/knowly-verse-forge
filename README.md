# Knowly Verse Forge

A collaborative knowledge base platform built with React, Supabase, and a modern UI stack.

---

## 🚀 Setup Steps

1. **Clone the repository:**
   ```sh
   git clone <YOUR_GIT_URL>
   cd knowly-verse-forge
   ```
2. **Install dependencies:**
   ```sh
   npm install
   # or
   bun install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your Supabase and other secrets.
   - Example:
     ```env
     VITE_SUPABASE_URL=your-supabase-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
4. **Start the development server:**
   ```sh
   npm run dev
   # or
   bun run dev
   ```
5. **Access the app:**
   - Visit [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🏗️ Architecture Overview

- **Frontend:**
  - React (functional components, hooks, RSC-first)
  - Tailwind CSS, shadcn-ui, Radix UI
  - Zustand, TanStack React Query for state/data
  - Zod for validation
  - React Router for routing
- **Backend:**
  - Supabase (Postgres, Auth, Storage)
  - RLS (Row Level Security) for secure data access
  - Triggers/functions for profile creation, document versioning
- **Features:**
  - Authentication (email/password, magic link, 2FA-ready)
  - Document collaboration, sharing, privacy controls
  - Global search, version history, real-time updates
  - Responsive, modern UI/UX

---

## 🧪 Demo Account Credentials

> **For demo/testing only. Do not use for production.**

- **Demo User 1:**
  - Email: `pravinvignesh2502@gmail.com`
  - Password: `Password@123`
- **Demo User 2:**
  - Email: `pravinvignesh13601@gmail.com`
  - Password: `Password@123`

Use these accounts to log in and explore the app's features.

---

## 📄 License

MIT
