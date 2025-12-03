# Quick Test: Judge0 API Connection

## Test Your API Key

Run this command to verify your Judge0 API connection:

### Windows (Command Prompt/PowerShell)
```bash
curl --request GET --url https://judge0-ce.p.rapidapi.com/about --header "x-rapidapi-host: judge0-ce.p.rapidapi.com" --header "x-rapidapi-key: YOUR_API_KEY_HERE"
```

### Linux/Mac
```bash
curl --request GET \
  --url https://judge0-ce.p.rapidapi.com/about \
  --header 'x-rapidapi-host: judge0-ce.p.rapidapi.com' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

## Expected Success Response

```json
{
  "version": "1.14.0",
  "homepage": "https://judge0.com",
  "source_code": "https://github.com/judge0/judge0",
  "maintainer": "Herman Zvonimir Došilović <hermanz.dosilovic@gmail.com>"
}
```

## If You Get Errors

- **401 Unauthorized**: Check your API key
- **403 Forbidden**: Verify your RapidAPI subscription is active
- **Connection timeout**: Check your internet connection

## Next Steps

Once the API test succeeds:
1. Add your API key to `backend/.env` file
2. Restart your backend server
3. Test code execution in the application



