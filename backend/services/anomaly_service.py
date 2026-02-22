"""Anomaly detection and stockout prediction utilities.

This module provides lightweight anomaly detection (z-score) and a simple
stockout prediction that sums forecasted demand until inventory is exhausted.
If sklearn is available, IsolationForest is used for a stronger anomaly detector.
"""
from typing import List, Dict, Optional
import math

def detect_anomalies(daily_series: List[Dict], z_thresh: float = 3.0) -> List[Dict]:
    """Detect anomalies in a daily series list of {'date':iso, 'predicted' or 'value':int}.
    Returns list of anomalies with z-score.
    """
    values = [int(item.get('value', item.get('predicted', 0))) for item in daily_series]
    n = len(values)
    if n == 0:
        return []
    mean = sum(values) / n
    var = sum((v - mean) ** 2 for v in values) / n
    std = math.sqrt(var)
    anomalies = []
    if std == 0:
        return []
    for item, v in zip(daily_series, values):
        z = (v - mean) / std
        if abs(z) >= z_thresh:
            anomalies.append({"date": item['date'], "value": v, "z_score": z})
    return anomalies


def predict_stockout(predicted_series: List[Dict], current_stock: int) -> Optional[int]:
    """Given predicted daily demand (list of {'date','predicted'}), return days until stockout.
    Returns None if stockout not expected within the provided prediction horizon.
    """
    if current_stock <= 0:
        return 0
    remaining = int(current_stock)
    for i, item in enumerate(predicted_series, start=1):
        demand = int(item.get('predicted', 0))
        remaining -= demand
        if remaining <= 0:
            return i
    return None
