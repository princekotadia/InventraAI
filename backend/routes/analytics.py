# routes/analytics.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from pydantic import BaseModel, conint, confloat
from services.bundling_service import generate_product_bundles
from services.rebalance_service import generate_rebalance_recommendations
from services.insight_service import generate_insights
from services.profit_forecast_service import calculate_profit_forecast
from services.risk_service import calculate_risk


from services.cashflow_service import (
    calculate_inventory_value,
    build_sales_map,
    detect_dead_stock,
    calculate_efficiency,
)


from services.forecast_service import forecast_next_days, forecast_next_7_days
from services.anomaly_service import detect_anomalies, predict_stockout
from services.association_service import generate_association_rules


router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/cashflow")
def get_cashflow(db: Session = Depends(get_db)):

    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    sales_map = build_sales_map(sales)

    total_inventory_value = calculate_inventory_value(products)
    dead_stock = detect_dead_stock(products, sales_map)
    efficiency = calculate_efficiency(products, sales_map)

    return {
        "total_inventory_value": total_inventory_value,
        "efficiency_score": efficiency,
        "dead_stock_products": [p.name for p in dead_stock]
    }


@router.get("/forecast/{product_id}")
def get_forecast(product_id: int, db: Session = Depends(get_db)):

    sales = db.query(models.Sale).all()

    # keep backward-compatible simple forecast
    prediction = forecast_next_7_days(product_id, sales)

    return {
        "product_id": product_id,
        "predicted_sales_next_7_days": prediction
    }


@router.get("/forecast_advanced/{product_id}")
def get_forecast_advanced(product_id: int, days: int = 14, db: Session = Depends(get_db)):
    """Advanced time-series forecast using Prophet / SARIMAX / fallback.
    Returns daily predictions and stock-out estimation.
    """
    sales = db.query(models.Sale).filter(models.Sale.product_id == product_id).all()
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    series, meta = forecast_next_days(product_id, sales, days=days)

    # predict stockout day (days until stock reaches zero)
    stockout = predict_stockout(series, current_stock=(product.current_stock or 0))

    return {
        "product_id": product_id,
        "predictions": series,
        "stockout_in_days": stockout,
        "model_info": meta,
    }


@router.get("/bundles")
def get_bundles(db: Session = Depends(get_db)):

    sales = db.query(models.Sale).all()
    products = db.query(models.Product).all()

    bundles = generate_product_bundles(sales)

    # Convert product IDs to names
    product_map = {p.id: p.name for p in products}

    formatted_bundles = []

    for bundle in bundles:
        formatted_bundles.append({
            "product_1": product_map.get(bundle["product_1"]),
            "product_2": product_map.get(bundle["product_2"]),
            "frequency": bundle["frequency"]
        })

    return {
        "suggested_bundles": formatted_bundles
    }


@router.get("/bundles_advanced")
def get_bundles_advanced(db: Session = Depends(get_db), min_support: int = 2, min_confidence: float = 0.5):
    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    rules = generate_association_rules(sales, min_support=min_support, min_confidence=min_confidence)

    product_map = {p.id: p.name for p in products}
    formatted = []
    for r in rules:
        formatted.append({
            "antecedent": product_map.get(r['antecedent']),
            "consequent": product_map.get(r['consequent']),
            "support": r['support'],
            "confidence": r['confidence'],
            "lift": r['lift']
        })

    return {"association_rules": formatted}


@router.get("/anomalies/{product_id}")
def get_anomalies(product_id: int, db: Session = Depends(get_db), z_thresh: float = 3.0):
    sales = db.query(models.Sale).filter(models.Sale.product_id == product_id).all()
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # build daily series
    daily = {}
    for s in sales:
        if not s.sale_date:
            continue
        key = s.sale_date.isoformat()
        daily.setdefault(key, 0)
        daily[key] += s.quantity_sold

    series = [{"date": k, "value": v} for k, v in sorted(daily.items())]
    anomalies = detect_anomalies(series, z_thresh=z_thresh)

    return {"product": product.name, "anomalies": anomalies}


@router.get("/insights_gpt")
def insights_gpt(db: Session = Depends(get_db)):
    """Generate natural-language insights. If OPENAI_API_KEY is set, call GPT; otherwise use rule-based summaries."""
    import os
    openai_key = os.getenv("OPENAI_API_KEY")

    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    # Build simple metrics: top 3 by units sold in last 7 days and WoW change for each
    from datetime import date, timedelta
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    fourteen_days_ago = today - timedelta(days=14)

    sold_last_7 = {}
    sold_prev_7 = {}
    for s in sales:
        if not s.sale_date:
            continue
        d = s.sale_date
        if d >= seven_days_ago:
            sold_last_7[s.product_id] = sold_last_7.get(s.product_id, 0) + s.quantity_sold
        elif d >= fourteen_days_ago:
            sold_prev_7[s.product_id] = sold_prev_7.get(s.product_id, 0) + s.quantity_sold

    # compute percent change
    insights_lines = []
    for p in products:
        last = sold_last_7.get(p.id, 0)
        prev = sold_prev_7.get(p.id, 0) or 1  # avoid div0
        pct = ((last - prev) / prev) * 100
        if abs(pct) >= 10:
            trend = "up" if pct > 0 else "down"
            insights_lines.append(f"{p.name}: sales {trend} {int(abs(pct))}% WoW (last7={last}, prev7={prev}).")

    summary_text = "\n".join(insights_lines) or "No notable week-over-week changes detected."

    # If OpenAI key present, ask model to rewrite into succinct insights
    if openai_key:
        try:
            import openai
            openai.api_key = openai_key
            prompt = f"You are an inventory analyst. Summarize the following observations into 3 concise bullet insights:\n\n{summary_text}"
            resp = openai.ChatCompletion.create(
                model=os.getenv('OPENAI_MODEL', 'gpt-4o-mini') if os.getenv('OPENAI_MODEL') else 'gpt-4o-mini',
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3,
            )
            text = resp['choices'][0]['message']['content']
            return {"insights": text, "source": "gpt"}
        except Exception:
            # fall through to rule-based
            pass

    return {"insights": summary_text, "source": "rule_based"}


@router.get("/rebalance")
def get_rebalance(db: Session = Depends(get_db)):

    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    # Build sales map
    sales_map = {}
    for sale in sales:
        sales_map.setdefault(sale.product_id, []).append(sale.quantity_sold)

    recommendations = generate_rebalance_recommendations(products, sales_map)

    return {
        "rebalance_recommendations": recommendations
    }

@router.get("/insights")
def get_ai_insights(db: Session = Depends(get_db)):

    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    # Build sales map
    sales_map = {}
    for sale in sales:
        sales_map.setdefault(sale.product_id, []).append(sale.quantity_sold)

    # Rebalance recommendations
    rebalance = generate_rebalance_recommendations(products, sales_map)

    # Cashflow metrics
    total_inventory_value = calculate_inventory_value(products)
    dead_stock = detect_dead_stock(products, sales_map)
    efficiency = calculate_efficiency(products, sales_map)

    cashflow = {
        "total_inventory_value": total_inventory_value,
        "dead_stock_products": [p.name for p in dead_stock],
        "efficiency_score": efficiency
    }

    insights = generate_insights(rebalance, cashflow)

    return {
        "ai_insights": insights
    }
    
@router.get("/risk")
def get_risk_analysis(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    sales_map = {}
    for sale in sales:
        sales_map.setdefault(sale.product_id, []).append(sale.quantity_sold)

    result = calculate_risk(products, sales_map)

    return {"risk_analysis": result}


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    # Total revenue and profit from recorded sales
    sales = db.query(models.Sale).all()
    products = {p.id: p for p in db.query(models.Product).all()}

    total_revenue = 0.0
    total_cost = 0.0
    for s in sales:
        p = products.get(s.product_id)
        if not p:
            continue
        total_revenue += s.quantity_sold * (p.selling_price or 0)
        total_cost += s.quantity_sold * (p.cost_price or 0)

    total_profit = total_revenue - total_cost

    # Inventory value and simple efficiency (sales per stock)
    inventory_value = sum([(p.current_stock or 0) * (p.cost_price or 0) for p in products.values()])

    # Efficiency score: ratio of sold units to inventory (clamped)
    total_stock = sum([(p.current_stock or 0) for p in products.values()])
    sold_units = sum([s.quantity_sold for s in sales])
    efficiency = (sold_units / total_stock * 100) if total_stock > 0 else 0

    return {
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "inventory_value": inventory_value,
        "efficiency_score": round(efficiency, 2),
        "total_stock": total_stock
    }


@router.get("/revenue_trend")
def revenue_trend(db: Session = Depends(get_db)):
    # Aggregate revenue by sale_date
    sales = db.query(models.Sale).all()
    products = {p.id: p for p in db.query(models.Product).all()}

    trend = {}
    for s in sales:
        date_key = s.sale_date.isoformat() if s.sale_date else "unknown"
        p = products.get(s.product_id)
        if not p:
            continue
        revenue = (p.selling_price or 0) * s.quantity_sold
        profit = ((p.selling_price or 0) - (p.cost_price or 0)) * s.quantity_sold
        entry = trend.setdefault(date_key, {"revenue": 0.0, "profit": 0.0, "units": 0})
        entry["revenue"] += revenue
        entry["profit"] += profit
        entry["units"] += s.quantity_sold

    # Convert to sorted list
    items = sorted([{"date": k, **v} for k, v in trend.items()], key=lambda x: x["date"])
    return {"trend": items}


@router.get("/insights_nl")
def insights_nl(db: Session = Depends(get_db)):
    # Build simple natural-language insights based on risk and stock/demand
    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    sales_map = {}
    for sale in sales:
        sales_map.setdefault(sale.product_id, []).append(sale.quantity_sold)

    insights = []
    for p in products:
        sales_list = sales_map.get(p.id, [])
        avg_weekly = (sum(sales_list) / len(sales_list)) if sales_list else 0
        if avg_weekly == 0 and (p.current_stock or 0) > 0:
            insights.append(f"{p.name} has no recent sales but holds {p.current_stock} units; consider promotions or delisting.")
            continue

        if avg_weekly > 0:
            overstock_pct = ((p.current_stock - avg_weekly * 4) / (avg_weekly * 4)) * 100 if avg_weekly * 4 > 0 else 0
            if overstock_pct > 20:
                freed = int((p.current_stock - avg_weekly * 4) * (p.cost_price or 0))
                insights.append(f"{p.name} is overstocked by {int(overstock_pct)}% vs 4-week demand. Reducing reorder could free ₹{freed} in working capital.")
            elif overstock_pct < -50:
                insights.append(f"{p.name} is understocked vs demand; consider increasing reorder to avoid stockouts.")

    return {"insights": insights}


@router.get("/cashflow_guardian")
def cashflow_guardian(db: Session = Depends(get_db)):
    # Simple burn rate: average daily profit over last 14 days; runway = total cash / daily_loss
    # We approximate 'working capital' by inventory value for this demo
    sales = db.query(models.Sale).all()
    products = {p.id: p for p in db.query(models.Product).all()}

    # Compute last 14-day profit average
    from collections import defaultdict
    profit_by_day = defaultdict(float)
    for s in sales:
        date_key = s.sale_date.isoformat() if s.sale_date else None
        p = products.get(s.product_id)
        if not p or date_key is None:
            continue
        profit_by_day[date_key] += ((p.selling_price or 0) - (p.cost_price or 0)) * s.quantity_sold

    days = sorted(profit_by_day.keys(), reverse=True)[:14]
    if days:
        avg_daily_profit = sum(profit_by_day[d] for d in days) / len(days)
    else:
        avg_daily_profit = 0

    inventory_value = sum([(p.current_stock or 0) * (p.cost_price or 0) for p in products.values()])

    # If avg_daily_profit <= 0, we compute days until inventory value / abs(avg_daily_profit)
    if avg_daily_profit >= 0:
        return {"status": "healthy", "message": "Positive average daily profit", "days_runway": None}

    days_runway = int(inventory_value / abs(avg_daily_profit)) if avg_daily_profit != 0 else None

    return {"status": "at_risk", "message": f"Estimated runway based on inventory: {days_runway} days", "days_runway": days_runway}


@router.get("/ai_analysis")
def ai_analysis(product_id: int, days: int = 7, db: Session = Depends(get_db)):
    """Perform a simple regression-based forecast for the given product using historical sales.
    Returns predicted daily units for the next `days` days and a recommended reorder quantity.
    """
    from datetime import date, timedelta

    sales = db.query(models.Sale).filter(models.Sale.product_id == product_id).all()
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not sales:
        return {"message": "No sales history for this product", "predictions": [], "recommended_reorder": 0}

    # Aggregate sales by day
    daily = {}
    for s in sales:
        key = s.sale_date.isoformat() if s.sale_date else None
        if key is None:
            continue
        daily.setdefault(key, 0)
        daily[key] += s.quantity_sold

    # Convert to list of (x, y) where x is ordinal day
    import math
    xs = []
    ys = []
    for k, v in sorted(daily.items()):
        d = date.fromisoformat(k)
        xs.append(d.toordinal())
        ys.append(v)

    n = len(xs)
    if n < 2:
        # not enough data for regression; return average
        avg = sum(ys) / (n or 1)
        preds = [int(round(avg)) for _ in range(days)]
        recommended = max(0, sum(preds) - (product.current_stock or 0))
        return {"predictions": preds, "recommended_reorder": recommended}

    # Try using scikit-learn RandomForest for stronger predictions when available.
    try:
        from sklearn.ensemble import RandomForestRegressor
        import numpy as np

        X = np.array(xs).reshape(-1, 1)
        y = np.array(ys)

        # Use a small random forest for robust, non-linear forecasting on small datasets
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        last_day = max(xs)
        preds = []
        for i in range(1, days + 1):
            xpred = np.array([[last_day + i]])
            ypred = model.predict(xpred)[0]
            preds.append(int(max(0, round(float(ypred)))))

        recommended = max(0, sum(preds) - (product.current_stock or 0))

        # rough std error from residuals
        residuals = y - model.predict(X)
        mse = float((residuals ** 2).mean()) if residuals.size > 0 else 0.0
        std = float(math.sqrt(mse))

        return {"predictions": preds, "recommended_reorder": recommended, "model": {"method": "random_forest", "std_error": std}}

    except Exception:
        # Fallback to simple linear regression if sklearn not available or fails
        x_mean = sum(xs) / n
        y_mean = sum(ys) / n
        num = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n))
        den = sum((xs[i] - x_mean) ** 2 for i in range(n))
        a = num / den if den != 0 else 0
        b = y_mean - a * x_mean

        last_day = max(xs)
        preds = []
        for i in range(1, days + 1):
            xpred = last_day + i
            ypred = a * xpred + b
            ypred = max(0, ypred)
            preds.append(int(round(ypred)))

        recommended = max(0, sum(preds) - (product.current_stock or 0))

        residuals = [ys[i] - (a * xs[i] + b) for i in range(n)]
        mse = sum(r * r for r in residuals) / n
        std = math.sqrt(mse)

        return {"predictions": preds, "recommended_reorder": recommended, "model": {"method": "linear", "slope": a, "intercept": b, "std_error": std}}


@router.get("/profit-forecast")
def get_profit_forecast(db: Session = Depends(get_db)):

    products = db.query(models.Product).all()
    sales = db.query(models.Sale).all()

    # Build sales map
    sales_map = {}
    for sale in sales:
        sales_map.setdefault(sale.product_id, []).append(sale.quantity_sold)

    result = calculate_profit_forecast(products, sales_map)

    return result

class SimulateRequest(BaseModel):
    product_id: int
    new_price: confloat(ge=0)
    new_stock: conint(ge=0)


@router.post("/simulate")
def simulate_profit(data: SimulateRequest, db: Session = Depends(get_db)):
    product_id = data.product_id
    new_price = data.new_price
    new_stock = data.new_stock

    product = db.query(models.Product).filter(models.Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Basic simulation logic; estimated sales can't exceed stock and is capped at 70% demand assumption
    estimated_sales = min(new_stock, int(new_stock * 0.7))

    revenue = estimated_sales * new_price
    cost = estimated_sales * product.cost_price
    profit = revenue - cost

    return {
        "simulated_revenue": revenue,
        "simulated_profit": profit
    }