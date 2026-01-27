# 🔧 Installing .NET SDK on Windows

## Quick Install

### Option 1: Winget (Recommended - Fastest)
```powershell
winget install Microsoft.DotNet.SDK.8
```

### Option 2: Direct Download
1. Go to: https://dotnet.microsoft.com/download/dotnet/8.0
2. Download: **.NET 8.0 SDK** (not Runtime)
3. Run the installer
4. Restart your terminal/PowerShell

### Option 3: Visual Studio Installer
If you have Visual Studio:
1. Open Visual Studio Installer
2. Modify your installation
3. Check ".NET desktop development" workload
4. Install

---

## Verify Installation

After installing, **restart your terminal** and run:

```powershell
dotnet --version
```

You should see something like: `8.0.x`

---

## If You Can't Install .NET Right Now

You can still run the **Frontend** and **Scraper** without the backend:

### Run Frontend Only (Mock Mode)
```powershell
cd frontend
npm run dev
```

The UI will work, but API calls will fail (expected).

### Run Scraper Only
```powershell
cd scraper
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## After Installing .NET

Once .NET is installed, you can run the backend:

```powershell
cd backend/Interviewly.API
dotnet restore
dotnet run
```

The backend will start on **http://localhost:5000**

---

## Full System Check

Run this to check all prerequisites:

```powershell
# Check .NET
dotnet --version

# Check Node.js
node --version

# Check Python
python --version

# Check npm
npm --version
```

All should return version numbers if installed correctly.

---

## Quick Start After Installation

Once everything is installed:

```powershell
# From the Interviewly root directory
.\start.ps1
```

This will start all three services automatically!

---

**Need help? The .NET SDK download page has detailed instructions for all platforms.**
