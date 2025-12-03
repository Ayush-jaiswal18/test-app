// Quick setup script to create .env file
const fs = require('fs');
const path = require('path');

const envContent = `# Database Configuration
MONGO_URI=mongodb://localhost:27017/test-portal
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/test-portal

# JWT Secret (generate a random string - change this!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Port
PORT=5000

# Judge0 API Configuration
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=876b679487msh34c078895b323dfp1b032bjsn7f0c6200b3e0

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
`;

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log('   If you want to recreate it, delete the existing file first.');
} else {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📝 Please edit .env and update:');
  console.log('   - MONGO_URI (your MongoDB connection string)');
  console.log('   - JWT_SECRET (a secure random string)');
  console.log('   - JUDGE0_KEY (if different from default)');
}



