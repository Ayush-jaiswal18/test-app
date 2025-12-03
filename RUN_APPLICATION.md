# How to Run the Test Portal Application

## Quick Start (3 Steps)

### Step 1: Set Up Environment Variables

**Option A: Use the setup script (Easiest)**
```bash
cd test-app/backend
node setup-env.js
```

Then edit the created `.env` file and update:
- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string

**Option B: Create manually**
Create `test-app/backend/.env` file with:
```env
MONGO_URI=mongodb://localhost:27017/test-portal
JWT_SECRET=your_secret_key_here
PORT=5000
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=876b679487msh34c078895b323dfp1b032bjsn7f0c6200b3e0
FRONTEND_URL=http://localhost:5173
```

### Step 2: Start Backend Server

Open **Terminal 1**:
```bash
cd test-app/backend
npm install    # Only needed first time
npm run dev    # Starts backend on http://localhost:5000
```

Wait for: `Server is running on port 5000` and `MongoDB Connected...`

### Step 3: Start Frontend Server

Open **Terminal 2** (new terminal window):
```bash
cd test-app/frontend
npm install    # Only needed first time
npm run dev    # Starts frontend on http://localhost:5173
```

Wait for: `Local: http://localhost:5173/`

### Step 4: Open in Browser

Go to: **http://localhost:5173**

## Detailed Instructions

### Prerequisites Check

1. **Node.js installed?**
   ```bash
   node --version  # Should be v14 or higher
   ```

2. **MongoDB running?**
   - Local: Make sure MongoDB service is running
   - Cloud (Atlas): Just need connection string

3. **Dependencies installed?**
   ```bash
   # Backend
   cd test-app/backend
   npm install
   
   # Frontend
   cd test-app/frontend
   npm install
   ```

### Running on Windows

**PowerShell or Command Prompt:**

**Window 1 - Backend:**
```powershell
cd C:\Users\prati\Desktop\Test-Portal\test-app\backend
npm run dev
```

**Window 2 - Frontend:**
```powershell
cd C:\Users\prati\Desktop\Test-Portal\test-app\frontend
npm run dev
```

### Running on Linux/Mac

**Terminal 1 - Backend:**
```bash
cd test-app/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd test-app/frontend
npm run dev
```

## What You Should See

### Backend Terminal:
```
Server is running on port 5000
MongoDB Connected: localhost:27017
```

### Frontend Terminal:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Browser:
- Login/Signup page
- After login: Dashboard with test management

## First Time Setup

1. **Create Admin Account:**
   - Go to http://localhost:5173
   - Click "Sign Up"
   - Create your admin account

2. **Create a Test:**
   - Login to dashboard
   - Click "Create Test"
   - Add questions (MCQ or Coding)
   - Save test

3. **Test It:**
   - Copy test link
   - Open in incognito window (as student)
   - Take the test
   - View results in admin dashboard

## Troubleshooting

### "Cannot find module" errors
```bash
# Reinstall dependencies
cd test-app/backend && npm install
cd test-app/frontend && npm install
```

### "MongoDB connection error"
- Check MongoDB is running
- Verify MONGO_URI in .env is correct
- For Atlas: Check connection string format

### "Port already in use"
- Backend: Change PORT in .env (default: 5000)
- Frontend: Vite will auto-use next available port

### "Code execution not working"
- Check JUDGE0_KEY in backend/.env
- Verify API key is correct
- Test with: See JUDGE0_SETUP.md

## Stopping the Servers

Press `Ctrl + C` in each terminal to stop the servers.

## Production Build

**Build Frontend:**
```bash
cd test-app/frontend
npm run build
```

**Start Backend (Production):**
```bash
cd test-app/backend
npm start
```

## Need More Help?

- See `QUICK_START.md` for detailed setup
- See `JUDGE0_SETUP.md` for code execution setup
- See `CODING_QUESTIONS_GUIDE.md` for coding features



