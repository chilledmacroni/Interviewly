# 🎯 Interviewly - AI-Powered Mock Interview Assistant

A full-stack web application that provides AI-powered mock technical interviews using **Gemini 1.5 Pro**, with personalized questions based on your resume or job description.

![Tech Stack](https://img.shields.io/badge/ASP.NET_Core-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

## ✨ Features

- 🤖 **AI-Powered Interviews** - Gemini 1.5 Pro generates contextual questions
- 📊 **Real-time Scoring** - Get instant feedback (0-10 scale) after each answer
- 🎨 **Premium UI/UX** - Glassmorphism design with smooth animations
- 📄 **Resume Analysis** - Paste your resume for personalized questions
- 🔗 **JD Scraping** - Provide a job posting URL (scraped via Crawl4AI)
- 💬 **Chat Interface** - Natural conversation flow
- 📈 **Detailed Summary** - Comprehensive performance breakdown at the end
- 🎚️ **Difficulty Levels** - Easy (5Q), Medium (7Q), Hard (10Q)

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   React     │─────▶│  ASP.NET Core    │─────▶│   Gemini    │
│  Frontend   │      │     Backend      │      │  1.5 Pro    │
│  (Vite +    │      │  (C# + Google.   │      │             │
│  Tailwind)  │      │   GenAI SDK)     │      └─────────────┘
└─────────────┘      └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   MongoDB Atlas  │
                     │   (Transcripts)  │
                     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Crawl4AI (Py)   │
                     │  FastAPI Service │
                     └──────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **.NET 8 SDK** (for backend)
- **Node.js 18+** (for frontend)
- **Python 3.10+** (for scraper)
- **MongoDB Atlas** account (free tier works)
- **Google Gemini API Key** ([Get one here](https://ai.google.dev/))

### 1️⃣ Backend Setup (ASP.NET Core)

```bash
cd backend/Interviewly.API

# Update appsettings.json with your credentials:
# - GeminiSettings.ApiKey
# - MongoDbSettings.ConnectionString

# Restore packages
dotnet restore

# Run the backend
dotnet run
```

Backend will run on `http://localhost:5000`

### 2️⃣ Scraper Setup (Python FastAPI)

```bash
cd scraper

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run the scraper service
python main.py
```

Scraper will run on `http://localhost:8000`

### 3️⃣ Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Run development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
Interviewly/
├── backend/
│   └── Interviewly.API/
│       ├── Controllers/
│       │   └── InterviewController.cs
│       ├── Services/
│       │   ├── InterviewService.cs
│       │   └── ScraperService.cs
│       ├── Models/
│       │   ├── InterviewModels.cs
│       │   └── InterviewSession.cs
│       ├── Configuration/
│       │   └── AppSettings.cs
│       ├── Program.cs
│       └── appsettings.json
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── InterviewSetup.tsx
│       │   ├── InterviewSession.tsx
│       │   ├── ChatMessage.tsx
│       │   ├── ScoreCard.tsx
│       │   ├── ProgressHeader.tsx
│       │   └── InterviewComplete.tsx
│       ├── services/
│       │   └── api.ts
│       ├── types/
│       │   └── index.ts
│       ├── App.tsx
│       └── index.css
└── scraper/
    ├── main.py
    ├── requirements.txt
    └── README.md
```

## 🔧 Configuration

### Backend (`appsettings.json`)

```json
{
  "GeminiSettings": {
    "ApiKey": "YOUR_GEMINI_API_KEY",
    "ModelName": "gemini-1.5-pro"
  },
  "MongoDbSettings": {
    "ConnectionString": "mongodb+srv://username:password@cluster.mongodb.net/",
    "DatabaseName": "InterviewlyDB"
  },
  "Crawl4AISettings": {
    "BaseUrl": "http://localhost:8000"
  }
}
```

## 🎮 Usage Flow

1. **Setup Interview**
   - Enter tech stack (e.g., "React, Node.js, TypeScript")
   - Choose difficulty (Easy/Medium/Hard)
   - Provide resume text OR job description URL

2. **Answer Questions**
   - Read AI-generated questions
   - Type your answers in the chat
   - Get instant scores (0-10) with feedback

3. **Review Results**
   - See overall performance score
   - Review individual question scores
   - Get improvement suggestions

## 🎨 Design System

- **Dark Theme** with animated gradient background
- **Glassmorphism** cards with backdrop blur
- **Purple-Cyan** gradient accent colors
- **Smooth animations** and micro-interactions
- **Responsive** layout for all screen sizes

## 📊 API Endpoints

### Backend (ASP.NET Core)

- `POST /api/interview/start` - Start new interview
- `POST /api/interview/answer` - Submit answer & get next question
- `GET /api/interview/stream/{sessionId}` - Stream AI responses (SSE)
- `GET /api/interview/session/{sessionId}` - Get session state

### Scraper (Python FastAPI)

- `GET /` - Health check
- `POST /scrape` - Scrape URL with options
- `POST /scrape/simple` - Simple URL scraping

## 🧪 Testing

### Test the Backend
```bash
# Navigate to backend
cd backend/Interviewly.API

# Run tests (if you add them)
dotnet test
```

### Test the Scraper
```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 🔐 Environment Variables

Create a `.env` file or use `appsettings.json`:

```env
GEMINI_API_KEY=your_api_key_here
MONGODB_CONNECTION_STRING=your_mongodb_uri
CRAWL4AI_BASE_URL=http://localhost:8000
```

## 🚢 Deployment

### Backend (Azure App Service)
1. Publish to Azure: `dotnet publish -c Release`
2. Deploy to App Service
3. Set environment variables in Azure Portal

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist` folder
3. Set API proxy in production

### Scraper (Railway/Render)
1. Deploy Python app
2. Set environment variables
3. Update backend config with new URL

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google Gemini** for the AI capabilities
- **Crawl4AI** for web scraping
- **MongoDB** for data persistence
- **Tailwind CSS** for styling utilities

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ by a Senior Developer with 8 years of experience**
