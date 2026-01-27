# Example Configuration

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

## Step 2: Set Up MongoDB Atlas (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Step 3: Update appsettings.json

Open `backend/Interviewly.API/appsettings.json` and update:

```json
{
  "GeminiSettings": {
    "ApiKey": "YOUR_GEMINI_API_KEY_HERE",
    "ModelName": "gemini-1.5-pro"
  },
  "MongoDbSettings": {
    "ConnectionString": "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/",
    "DatabaseName": "InterviewlyDB"
  },
  "Crawl4AISettings": {
    "BaseUrl": "http://localhost:8000"
  }
}
```

## Step 4: Run the Application

### Option A: Use the Quick Start Script (Recommended)
```powershell
.\start.ps1
```

### Option B: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend/Interviewly.API
dotnet run
```

**Terminal 2 - Scraper:**
```bash
cd scraper
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 5: Open the Application

Navigate to: **http://localhost:5173**

## Troubleshooting

### Backend won't start
- Make sure .NET 8 SDK is installed: `dotnet --version`
- Check if port 5000 is available
- Verify Gemini API key is valid
- Verify MongoDB connection string is correct

### Scraper won't start
- Make sure Python 3.10+ is installed: `python --version`
- Activate virtual environment first
- Install dependencies: `pip install -r requirements.txt`
- Check if port 8000 is available

### Frontend won't start
- Make sure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and run `npm install` again
- Check if port 5173 is available

### API calls failing
- Ensure all three services are running
- Check browser console for CORS errors
- Verify backend is accessible at http://localhost:5000/health
- Verify scraper is accessible at http://localhost:8000/health

## Testing the Setup

### Test Backend
```bash
curl http://localhost:5000/health
```

### Test Scraper
```bash
curl http://localhost:8000/health
```

### Test Full Flow
1. Open http://localhost:5173
2. Enter tech stack: "React, TypeScript"
3. Choose difficulty: "Easy"
4. Paste a sample resume or use a job URL
5. Click "Start Interview"
6. Answer the questions and see your scores!

## Sample Resume Text

If you don't have a resume handy, use this sample:

```
John Doe
Full Stack Developer

EXPERIENCE:
- 3 years of experience with React, TypeScript, and Node.js
- Built scalable web applications using modern frameworks
- Experience with RESTful APIs and database design
- Proficient in Git, CI/CD, and Agile methodologies

SKILLS:
- Frontend: React, TypeScript, HTML, CSS, Tailwind
- Backend: Node.js, Express, ASP.NET Core
- Database: MongoDB, PostgreSQL, SQL Server
- Tools: Git, Docker, VS Code, Azure
```

## Sample Job URLs to Test Scraping

- Any job posting from LinkedIn, Indeed, or company career pages
- Example: `https://www.example.com/careers/software-engineer`

---

**Need help? Check the main README.md or open an issue!**
