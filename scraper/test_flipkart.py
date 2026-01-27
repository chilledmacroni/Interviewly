import requests
import json
import sys

def test_flipkart():
    url = "http://localhost:8000/scrape"
    # Using a known Flipkart careers page logic or main page
    target_url = "https://www.flipkartcareers.com/"
    
    payload = {
        "url": target_url,
        "extract_markdown": True,
        "clean_content": True
    }
    
    print(f"Testing Scraper Service with {target_url}...")
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response JSON Keys:", list(data.keys()))
            print("Success:", data.get("success"))
            print("Error:", data.get("error"))
            content = data.get("content", "")
            print(f"Content length: {len(content)}")
            if len(content) > 100:
                print("Content sample:", content[:100].replace('\n', ' '))
            else:
                print("Content is too short or empty.")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_flipkart()
