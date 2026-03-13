# 🚀 End-to-End Deployment Guide

**Stack:** React (Vite) · Node/Express · MongoDB Atlas · Judge0 (RapidAPI)  
**Hosting:** Vercel (frontend) · Render (backend) · MongoDB Atlas (database)  
All tiers used below are **free**.

---

## Prerequisites

- [GitHub](https://github.com) account (push your code here first)
- [MongoDB Atlas](https://cloud.mongodb.com) account
- [Render](https://render.com) account
- [Vercel](https://vercel.com) account
- [RapidAPI](https://rapidapi.com) account (for Judge0 code execution)

---

## Step 1 — Push Code to GitHub

```bash
cd test-app          # repo root
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

> ⚠️ The `.gitignore` at the root excludes `.env` files — **never commit secrets**.

---

## Step 2 — Set Up MongoDB Atlas (Cloud Database)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign in.
2. Click **New Project** → name it → **Create Project**.
3. Click **Build a Database** → choose **M0 Free** → select a region → **Create**.
4. **Authentication** — create a database user:
   - Username: `testapp_user`
   - Password: (generate a strong password — save it)
5. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).
6. Click **Connect** on your cluster → **Drivers** → copy the connection string:
   ```
   mongodb+srv://testapp_user:<password>@cluster0.xxxxx.mongodb.net/test_app?retryWrites=true&w=majority
   ```
   Replace `<password>` with your actual password.

---

## Step 3 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**.
2. Connect your GitHub repo.
3. Configure the service:

   | Setting | Value |
   |---|---|
   | **Name** | `test-portal-backend` |
   | **Root Directory** | `test-app/backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Instance Type** | Free |

4. Scroll to **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `MONGO_URI` | *(your Atlas connection string)* |
   | `JWT_SECRET` | *(long random string — generate one below)* |
   | `JUDGE0_URL` | `https://judge0-ce.p.rapidapi.com` |
   | `JUDGE0_KEY` | *(your RapidAPI key)* |
   | `FRONTEND_URL` | *(your Vercel URL — add after Step 4)* |

   **Generate a secure JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. Click **Create Web Service** — wait for the deploy to finish.
6. Copy your backend URL: `https://test-portal-backend.onrender.com`

---

## Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repo.
3. Configure the project:

   | Setting | Value |
   |---|---|
   | **Root Directory** | `test-app/frontend` |
   | **Framework Preset** | `Vite` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. Under **Environment Variables** add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://test-portal-backend.onrender.com` |

5. Click **Deploy** — wait for it to finish.
6. Copy your frontend URL: `https://your-app.vercel.app`

---

## Step 5 — Wire Frontend URL back into Backend

1. Go back to your **Render** service → **Environment**.
2. Set `FRONTEND_URL` = `https://your-app.vercel.app`
3. Click **Save Changes** — Render will automatically redeploy.

---

## Step 6 — Verify the Deployment

| Check | URL |
|---|---|
| Backend health | `https://test-portal-backend.onrender.com/` |
| Frontend app | `https://your-app.vercel.app` |

Open the frontend, sign up as an admin, create a test, and verify code execution works.

---

## Get a Judge0 API Key (RapidAPI)

1. Go to [rapidapi.com](https://rapidapi.com) → search **"Judge0 CE"**.
2. Subscribe to the free plan.
3. Copy your **X-RapidAPI-Key** and add it as `JUDGE0_KEY` in Render.

---

## Environment Variables Summary

### Backend (set in Render dashboard)

| Variable | Description |
|---|---|
| `PORT` | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random secret |
| `JUDGE0_URL` | `https://judge0-ce.p.rapidapi.com` |
| `JUDGE0_KEY` | Your RapidAPI key |
| `FRONTEND_URL` | Your Vercel app URL |
| `NODE_ENV` | `production` |

### Frontend (set in Vercel dashboard)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Your Render backend URL |

---

## Local Development (unchanged)

```powershell
# Terminal 1 — Backend
cd test-app\backend
npm run dev          # runs on http://localhost:5002

# Terminal 2 — Frontend
cd test-app\frontend
npm run dev          # runs on http://localhost:3000
```

Make sure `backend/.env` has `MONGO_URI` pointing to your local or Atlas MongoDB.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Backend 502 on Render | Check logs in Render dashboard; usually a missing env var |
| CORS error in browser | Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly |
| MongoDB connection failed | Whitelist `0.0.0.0/0` in Atlas Network Access |
| Judge0 returns 401 | Verify `JUDGE0_KEY` is set correctly in Render |
| Vercel page refresh gives 404 | `frontend/vercel.json` handles SPA rewrites — confirm it was deployed |
| Render free tier sleeps | First request after inactivity takes ~30 s; upgrade to Starter to avoid |
