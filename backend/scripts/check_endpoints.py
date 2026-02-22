import urllib.request

def check(url):
    print('\n===', url, '===')
    req = urllib.request.Request(url, headers={'Origin': 'http://localhost:5173'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print('Status:', r.status)
            print('Headers:')
            for k, v in r.getheaders():
                print(f'  {k}: {v}')
            body = r.read().decode('utf-8')
            print('Body:', body[:1000])
    except urllib.error.HTTPError as e:
        print('HTTPError:', e.code)
        print('Headers:')
        for k, v in e.headers.items():
            print(f'  {k}: {v}')
        try:
            print('Body:', e.read().decode('utf-8'))
        except Exception:
            pass
    except Exception as e:
        print('Error:', repr(e))


if __name__ == '__main__':
    urls = [
        'http://127.0.0.1:8000/',
        'http://127.0.0.1:8000/products',
        'http://127.0.0.1:8000/analytics/metrics',
    ]
    for u in urls:
        check(u)
