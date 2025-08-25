# test_process.py
import requests

TOKEN = "'eyJhbGciOiJFUzI1NiIsImtpZCI6IjYxY2ZmODllLWM5YjktND…UcpTbzpC-yguu6YTszOt9_YiwubAhsU9H5yEP2zI23nfMZTsQ"
URL   = "http://localhost:8000/process"

with open("sample.pdf", "rb") as f:
    files = {"file": ("sample.pdf", f, "application/pdf")}
    data  = {"industry_type": "coating"}  # valinnainen
    r = requests.post(URL, headers={"Authorization": f"Bearer {TOKEN}"}, files=files, data=data)

print(r.status_code)
print(r.text)
