import json
from urllib import request, error

url = 'http://127.0.0.1:8000/products'
data = {
    'name': 'Test Product From Script',
    'cost_price': 12.5,
    'selling_price': 20.0,
    'current_stock': 10,
    'expiry_date': None
}

req = request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type':'application/json'})
try:
    with request.urlopen(req, timeout=10) as r:
        print('Status:', r.status)
        print('Body:', r.read().decode())
except error.HTTPError as e:
    print('HTTPError', e.code)
    try:
        print(e.read().decode())
    except Exception:
        pass
except Exception as e:
    print('Error:', e)
