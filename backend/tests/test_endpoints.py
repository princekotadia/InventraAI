from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_metrics_endpoint():
    resp = client.get("/analytics/metrics")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_revenue" in body
    assert "total_profit" in body


def test_insights_and_cashflow():
    r1 = client.get("/analytics/insights_nl")
    assert r1.status_code == 200
    assert isinstance(r1.json().get("insights"), list)

    r2 = client.get("/analytics/cashflow_guardian")
    assert r2.status_code == 200
    assert "status" in r2.json()
