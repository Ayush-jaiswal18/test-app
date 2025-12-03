# Quick Start Guide - Running the Test Portal

This guide will help you get the test portal up and running quickly.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)
- npm or yarn package manager

## Step-by-Step Setup

### 1. Set Up Environment Variables

#### Backend Configuration

Create a `.env` file in `test-app/backend/` folder:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/test-portal
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/test-portal

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Server Port
PORT=5000

# Judge0 API Configuration
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=876b679487msh34c078895b323dfp1b032bjsn7f0c6200b3e0

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

**Important**: 
- Replace `MONGODB_URI` with your MongoDB connection string
- Replace `JWT_SECRET` with a secure random string
- Your Judge0 API key is already configured

#### Frontend Configuration (Optional)

If needed, create a `.env` file in `test-app/frontend/` folder:

```env
VITE_API_URL=http://localhost:5000
```

### 2. Install Dependencies

#### Backend Dependencies

Open a terminal and navigate to the backend folder:

```bash
cd test-app/backend
npm install
```

#### Frontend Dependencies

Open another terminal and navigate to the frontend folder:

```bash
cd test-app/frontend
npm install
```

### 3. Start MongoDB

Make sure MongoDB is running:

**Local MongoDB:**
```bash
# Windows (if installed as service, it should start automatically)
# Or start manually:
mongod

# Linux/Mac
sudo systemctl start mongod
# OR
mongod
```

**MongoDB Atlas (Cloud):**
- No local setup needed, just ensure your connection string is correct

### 4. Start the Backend Server

In the backend terminal:

```bash
cd test-app/backend

# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

You should see:
```
Server is running on port 5000
MongoDB Connected...
```

### 5. Start the Frontend Server

In a new terminal:

```bash
cd test-app/frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 6. Access the Application

Open your browser and go to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## First Time Setup

### 1. Create an Admin Account

1. Go to http://localhost:5173
2. Click "Sign Up" (or navigate to `/signup`)
3. Create your admin account
4. Log in with your credentials

### 2. Create Your First Test

1. After logging in, go to Dashboard
2. Click "Create Test"
3. Fill in test details:
   - Title
   - Description
   - Duration
4. Add questions (MCQ or Coding questions)
5. Save the test

### 3. Test the Application

1. Copy the test link or shareable link
2. Open it in an incognito/private window (to simulate a student)
3. Enter student details and take the test
4. Submit the test
5. Go back to admin dashboard to view results

## Running Both Servers (Quick Commands)

### Windows (PowerShell - Two Windows)

**Terminal 1 (Backend):**
```powershell
cd test-app\backend
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd test-app\frontend
npm run dev
```

### Windows (Command Prompt - Two Windows)

**Terminal 1 (Backend):**
```cmd
cd test-app\backend
npm run dev
```

**Terminal 2 (Frontend):**
```cmd
cd test-app\frontend
npm run dev
```

### Linux/Mac (Two Terminals)

**Terminal 1 (Backend):**
```bash
cd test-app/backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd test-app/frontend
npm run dev
```

## Troubleshooting

### Backend Won't Start

1. **Port Already in Use:**
   ```bash
   # Change PORT in .env file or kill the process using port 5000
   ```

2. **MongoDB Connection Error:**
   - Check MongoDB is running
   - Verify MONGODB_URI in .env is correct
   - Check firewall settings

3. **Missing Dependencies:**
   ```bash
   cd test-app/backend
   npm install
   ```

### Frontend Won't Start

1. **Port Already in Use:**
   - Vite will automatically use the next available port

2. **Missing Dependencies:**
   ```bash
   cd test-app/frontend
   npm install
   ```

3. **API Connection Error:**
   - Ensure backend is running on port 5000
   - Check VITE_API_URL in frontend .env

### Code Execution Not Working

1. Verify Judge0 API key is correct in backend/.env
2. Test API connection (see JUDGE0_SETUP.md)
3. Check backend logs for errors
4. Ensure backend server was restarted after adding .env

## Production Deployment

For production deployment:

1. **Build Frontend:**
   ```bash
   cd test-app/frontend
   npm run build
   ```

2. **Start Backend in Production:**
   ```bash
   cd test-app/backend
   npm start
   ```

3. **Serve Frontend:**
   - Use a web server (nginx, Apache) to serve the `dist` folder
   - Or use a hosting service like Vercel, Netlify, etc.

## Next Steps

- Read `CODING_QUESTIONS_GUIDE.md` for coding questions features
- Read `JUDGE0_SETUP.md` for code execution setup
- Customize the application as needed

## Need Help?

- Check the troubleshooting section above
- Review backend logs for errors
- Check browser console for frontend errors
- Verify all environment variables are set correctly

