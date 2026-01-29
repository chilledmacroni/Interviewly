import requests
url = 'http://127.0.0.1:5000/api/extraction/resume'
files = {'file': open('sample_resume.docx', 'rb')}
resp = requests.post(url, files=files)
print('Status:', resp.status_code)
try:
    print(resp.json())
except Exception as e:
    print(resp.text)
