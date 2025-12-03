# Judge0 API Setup Guide

This guide will help you set up Judge0 API for code execution in your test portal.

## Option 1: Using RapidAPI (Recommended for Quick Setup)

### Step 1: Get RapidAPI Key
1. Go to [RapidAPI](https://rapidapi.com/)
2. Sign up or log in
3. Search for "Judge0 CE" in the marketplace
4. Subscribe to the API (free tier available)
5. Copy your API key from the dashboard

### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env` in the `backend` folder:
   ```bash
   cd test-app/backend
   cp .env.example .env
   ```

2. Edit `.env` and add your RapidAPI key:
   ```env
   JUDGE0_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_KEY=your_rapidapi_key_here
   ```

   **Important**: Replace `your_rapidapi_key_here` with your actual RapidAPI key.

### Step 3: Verify API Connection

Test your Judge0 API connection using curl:

**On Windows (Command Prompt or PowerShell):**
```bash
curl --request GET --url https://judge0-ce.p.rapidapi.com/about --header "x-rapidapi-host: judge0-ce.p.rapidapi.com" --header "x-rapidapi-key: YOUR_API_KEY_HERE"
```

**On Linux/Mac:**
```bash
curl --request GET \
  --url https://judge0-ce.p.rapidapi.com/about \
  --header 'x-rapidapi-host: judge0-ce.p.rapidapi.com' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

**Expected Response:**
If successful, you should see a JSON response like:
```json
{
  "version": "1.14.0",
  "homepage": "https://judge0.com",
  "source_code": "https://github.com/judge0/judge0",
  "maintainer": "Herman Zvonimir Došilović <hermanz.dosilovic@gmail.com>"
}
```

If you get an authentication error or 401/403 status, check that:
- Your API key is correct
- Your RapidAPI subscription is active
- The API key hasn't expired

### Step 4: Test the Setup in Application

After verifying the API connection, test it in your application:
1. Restart your backend server to load the new environment variables
2. Create a test with coding questions
3. Have a student write and run code
4. Check the output in the code editor

If code execution works, your setup is complete!

## Option 2: Self-Hosted Judge0 (Advanced)

If you want to host your own Judge0 instance:

### Step 1: Install Judge0
Follow the official Judge0 installation guide:
- [Judge0 GitHub](https://github.com/judge0/judge0)
- [Judge0 Documentation](https://judge0.com/)

### Step 2: Configure Environment Variables
```env
JUDGE0_URL=http://localhost:2358
JUDGE0_KEY=
```

### Step 3: Update Code Routes
If using a self-hosted instance, you may need to adjust the headers in `backend/routes/code.js` based on your Judge0 configuration.

## Supported Languages

The current implementation supports:
- **JavaScript** (Node.js) - Language ID: 63
- **Python 3** - Language ID: 71
- **C++** - Language ID: 54
- **Java** - Language ID: 62

To add more languages, update the `languageIdFor` function in `backend/routes/code.js` with the appropriate Judge0 language IDs.

## Troubleshooting

### Code Execution Not Working
1. Check that `JUDGE0_URL` and `JUDGE0_KEY` are set correctly in `.env`
2. Verify your RapidAPI subscription is active
3. Check backend logs for error messages
4. Ensure the backend server has been restarted after adding environment variables

### Rate Limiting
- RapidAPI free tier has rate limits
- Consider upgrading if you need higher limits
- Self-hosted Judge0 has no rate limits

### Timeout Issues
- Default timeout is 2 seconds
- Adjust `cpu_time_limit` in `backend/routes/code.js` if needed

## Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure
- Consider using environment-specific keys for production

