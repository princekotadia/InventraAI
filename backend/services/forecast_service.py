"""Forecasting utilities.

Tries to use Prophet when available, then statsmodels SARIMAX, then falls back
to a small RandomForest or linear extrapolation. All imports are optional so
the service degrades gracefully when heavy ML libraries aren't installed.
"""
from datetime import date, timedelta
from typing import List, Tuple, Dict

def _to_daily_series(sales):
    # sales: list of Sale objects with sale_date and quantity_sold
    daily = {}
    for s in sales:
        if not s.sale_date:
            continue
        key = s.sale_date.isoformat()
        daily.setdefault(key, 0)
        daily[key] += s.quantity_sold
    # sort by date
    items = sorted(daily.items())
    return [(d, int(q)) for d, q in items]


def forecast_next_7_days(product_id, sales):
    series, meta = forecast_next_days(product_id, sales, days=7)
    return series


def forecast_next_days(product_id, sales, days=14) -> Tuple[List[Dict], Dict]:
    """Return list of {'date': iso, 'predicted': int} and meta info.
    Attempts to use Prophet -> SARIMAX -> RandomForest -> linear.
    """
    daily = _to_daily_series(sales)

    if not daily:
        return ([], {"method": "none", "note": "no_sales_history"})

    # Prepare arrays
    dates = [date.fromisoformat(d) for d, _ in daily]
    values = [v for _, v in daily]

    # try prophet
    try:
        from prophet import Prophet
        import pandas as pd

        df = pd.DataFrame({"ds": dates, "y": values})
        m = Prophet()
        m.fit(df)
        future = m.make_future_dataframe(periods=days)
        fcst = m.predict(future)
        preds = fcst[['ds', 'yhat']].tail(days)
        out = []
        for _, row in preds.iterrows():
            out.append({"date": row['ds'].date().isoformat(), "predicted": max(0, int(round(row['yhat'])))} )

        return (out, {"method": "prophet"})
    except Exception:
        pass

    # try SARIMAX from statsmodels
    try:
        import numpy as np
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        y = np.array(values, dtype=float)
        # simple seasonal ARIMA fallback
        model = SARIMAX(y, order=(1,1,0), seasonal_order=(0,0,0,0), enforce_stationarity=False, enforce_invertibility=False)
        res = model.fit(disp=False)
        preds = res.get_forecast(steps=days)
        mean = preds.predicted_mean
        last_date = dates[-1]
        out = []
        for i in range(1, days+1):
            d = last_date + timedelta(days=i)
            out.append({"date": d.isoformat(), "predicted": int(max(0, round(float(mean[i-1]))))})

        return (out, {"method": "sarimax"})
    except Exception:
        pass

    # try sklearn RandomForest
    try:
        import numpy as np
        from sklearn.ensemble import RandomForestRegressor

        X = np.array([d.toordinal() for d in dates]).reshape(-1,1)
        y = np.array(values)
        model = RandomForestRegressor(n_estimators=50, random_state=0)
        model.fit(X, y)
        last = dates[-1]
        out = []
        for i in range(1, days+1):
            d = last + timedelta(days=i)
            xp = np.array([[d.toordinal()]])
            yp = model.predict(xp)[0]
            out.append({"date": d.isoformat(), "predicted": int(max(0, round(float(yp))))})

        return (out, {"method": "random_forest"})
    except Exception:
        pass

    # final fallback: linear extrapolation on last slope
    try:
        ords = [d.toordinal() for d in dates]
        n = len(ords)
        x_mean = sum(ords)/n
        y_mean = sum(values)/n
        num = sum((ords[i]-x_mean)*(values[i]-y_mean) for i in range(n))
        den = sum((ords[i]-x_mean)**2 for i in range(n))
        a = num/den if den != 0 else 0
        b = y_mean - a * x_mean
        last = ords[-1]
        out = []
        for i in range(1, days+1):
            xpred = last + i
            ypred = a * xpred + b
            out.append({"date": date.fromordinal(int(xpred)).isoformat(), "predicted": int(max(0, round(ypred)))})

        return (out, {"method": "linear_fallback"})
    except Exception:
        return ([], {"method": "failed", "note": "could_not_forecast"})
# services/forecast_service.py

def forecast_next_7_days(product_id, sales):
    """
    Forecast next 7 days using simple moving average
    """

    # Filter sales for this product
    product_sales = [
        sale.quantity_sold for sale in sales if sale.product_id == product_id
    ]

    if len(product_sales) == 0:
        return 0

    if len(product_sales) < 7:
        avg = sum(product_sales) / len(product_sales)
    else:
        last_7 = product_sales[-7:]
        avg = sum(last_7) / 7

    return round(avg * 7, 2)