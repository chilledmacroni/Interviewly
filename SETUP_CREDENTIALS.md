# Setting Up Credentials

## Backend Configuration

1. **Copy the example file:**
   ```bash
   cd backend/Interviewly.API
   cp appsettings.Example.json appsettings.Development.json
   ```

2. **Update `appsettings.Development.json` with your credentials:**

   - **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
     ```json
     "GeminiSettings": {
       "ApiKey": "YOUR_ACTUAL_GEMINI_API_KEY"
     }
     ```

   - **MongoDB Connection**: Get from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
     ```json
     "MongoDbSettings": {
       "ConnectionString": "mongodb+srv://username:password@cluster.mongodb.net/"
     }
     ```

   - **JWT Secret**: Generate a secure random string (minimum 32 characters)
     ```json
     "JwtSettings": {
       "Secret": "your_secure_random_32_char_or_longer_secret_key"
     }
     ```

## Important Notes

- **Never commit** `appsettings.Development.json` or `appsettings.Production.json` to git
- These files are already in `.gitignore`
- Only commit `appsettings.json` (with placeholder values) and `appsettings.Example.json`
- Each developer should create their own `appsettings.Development.json` locally
