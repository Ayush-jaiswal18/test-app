// Import required packages
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

// Initialize the Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middlewares - CORS must come before routes
app.use(cors(corsOptions));
app.use(express.json()); // To parse JSON request bodies

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));


// API Routes
app.get('/', (req, res) => {
  res.send('Online Test Platform API is running...');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/code', require('./routes/code'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Serve uploads folder statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Proctoring endpoint
app.post("/api/report", (req, res) => {
  const { event, time } = req.body;
  console.log(`🚨 [${time}] ${event}`);
  // You can also save this in MongoDB:
  // await ProctorLog.create({ event, time });
  res.json({ status: "logged" });
});

// Define the port
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// Global error handler
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection! Shutting down...');
  console.log(err.name, err.message);
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception! Shutting down...');
  console.log(err.name, err.message);
});