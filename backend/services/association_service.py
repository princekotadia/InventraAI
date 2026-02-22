"""Simple Apriori-style association rule miner for bundle suggestions.

This implementation is intentionally lightweight and dependency-free so it
can run without external libraries. It computes frequent item pairs and
produces confidence/lift metrics.
"""
from collections import Counter, defaultdict
from itertools import combinations
from typing import List, Dict


def _transactions_from_sales(sales):
    # Group product_ids by sale_date (or transaction id if available)
    tx = defaultdict(set)
    for s in sales:
        key = s.sale_date.isoformat() if s.sale_date else None
        tx[key].add(s.product_id)
    return [set(items) for items in tx.values() if items]


def generate_association_rules(sales, min_support=2, min_confidence=0.5):
    """Return list of rules: {antecedent, consequent, support, confidence, lift}
    Support here is absolute count across transactions.
    """
    transactions = _transactions_from_sales(sales)
    n_tx = len(transactions)
    pair_counts = Counter()
    item_counts = Counter()

    for t in transactions:
        for item in t:
            item_counts[item] += 1
        for a, b in combinations(sorted(t), 2):
            pair_counts[(a, b)] += 1

    rules = []
    for (a, b), supp in pair_counts.items():
        if supp < min_support:
            continue
        # confidence a->b
        conf_ab = supp / item_counts[a] if item_counts[a] else 0
        conf_ba = supp / item_counts[b] if item_counts[b] else 0
        # lift = confidence / (support(b)/n_tx)
        lift_ab = conf_ab / (item_counts[b] / n_tx) if n_tx and item_counts[b] else 0
        lift_ba = conf_ba / (item_counts[a] / n_tx) if n_tx and item_counts[a] else 0

        if conf_ab >= min_confidence:
            rules.append({
                "antecedent": a,
                "consequent": b,
                "support": supp,
                "confidence": round(conf_ab, 2),
                "lift": round(lift_ab, 2),
            })

        if conf_ba >= min_confidence:
            rules.append({
                "antecedent": b,
                "consequent": a,
                "support": supp,
                "confidence": round(conf_ba, 2),
                "lift": round(lift_ba, 2),
            })

    # sort by support desc
    rules.sort(key=lambda r: r['support'], reverse=True)
    return rules
