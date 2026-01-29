import requests
import time
import pymongo

# Upload file to backend extraction endpoint
upload_url = 'http://127.0.0.1:5000/api/extraction/resume'
interview_start_url = 'http://127.0.0.1:5000/api/interview/start'

files = {'file': open('sample_resume.docx', 'rb')}
print('Uploading resume...')
resp = requests.post(upload_url, files=files)
print('Upload status:', resp.status_code)
print(resp.json())

if resp.status_code != 200:
    print('Extraction failed; aborting tests')
    exit(1)

extracted_text = resp.json().get('text', '')
print('Extracted text length:', len(extracted_text))

# Wait briefly for indexing job to finish (fire-and-forget)
print('Waiting for indexing to complete...')
time.sleep(3)

# Check MongoDB for document chunks
mongo_client = pymongo.MongoClient('mongodb+srv://anuskamithi:freshfunk12@cluster0.winhx.mongodb.net/')
db = mongo_client['InterviewlyDB']
chunks = list(db['document_chunks'].find().sort('createdAt', -1).limit(10))
print('Found chunks:', len(chunks))
if chunks:
    print('Sample chunk keys:', list(chunks[0].keys()))
    # Try different casing for text field
    sample_text = chunks[0].get('text') or chunks[0].get('Text') or chunks[0].get('content') or '<no-text-field>'
    print('Sample chunk text (first 200 chars):', sample_text[:200] if isinstance(sample_text, str) else sample_text)
    emb = chunks[0].get('embedding') or chunks[0].get('Embedding')
    if emb:
        print('Embedding length:', len(emb))
    else:
        print('No embedding found on sample chunk')

# Start an interview using extracted text
start_payload = {
    'techStack': 'General Technical Interview',
    'difficulty': 'medium',
    'resumeText': extracted_text
}
print('Starting interview...')
start_resp = requests.post(interview_start_url, json=start_payload)
print('Start status:', start_resp.status_code)
try:
    print('Start response JSON:', start_resp.json())
except Exception as e:
    print('Start response text:', start_resp.text)
    print('Error parsing JSON:', e)
