# Crawl4AI Scraper Service

FastAPI microservice for web scraping using Crawl4AI.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Service

```bash
python main.py
```

The service will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /scrape` - Scrape a URL with options
- `POST /scrape/simple` - Simple scrape endpoint

## Example Usage

```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/job-posting"}'
```
