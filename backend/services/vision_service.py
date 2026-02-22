"""Vision utilities for parsing vendor/shopkeeper bills (images).

This is a lightweight helper that attempts to use pytesseract to OCR the
image and then parse lines heuristically to extract (name, qty, price).
It degrades gracefully when `pytesseract` or `PIL` are not available.
"""
import re
from typing import List, Dict, Tuple

def _safe_import_pil_tesseract():
    try:
        from PIL import Image
        import pytesseract
        return Image, pytesseract
    except Exception:
        return None, None


def parse_text_lines(text: str) -> List[Dict]:
    """Heuristic parser: for each non-empty line, try to extract numbers.
    If two numbers found: treat as qty and price (or price & qty). If one
    number found: assume price and qty=1. Otherwise treat whole line as name.
    """
    items = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for ln in lines:
        # Remove common words
        clean = re.sub(r"\b(total|subtotal|gst|tax|amount|tnx|invoice)\b", '', ln, flags=re.I)
        # find numbers (ints or floats)
        nums = re.findall(r"\d+[\d.,]*", clean)
        # normalize numbers
        parsed_nums = []
        for n in nums:
            n2 = n.replace(',', '')
            try:
                if '.' in n2:
                    parsed_nums.append(float(n2))
                else:
                    parsed_nums.append(int(n2))
            except Exception:
                continue

        if len(parsed_nums) >= 2:
            # guess: last number is price, previous number is qty (if small)
            price = float(parsed_nums[-1])
            qty_candidate = parsed_nums[-2]
            qty = int(qty_candidate) if isinstance(qty_candidate, int) and qty_candidate < 1000 else 1
            name = re.sub(re.escape(nums[-1]), '', clean).strip()  # remove last numeric token
            items.append({"name": name or "item", "qty": qty, "price": price})
        elif len(parsed_nums) == 1:
            price = float(parsed_nums[0])
            name = re.sub(re.escape(nums[0]), '', clean).strip()
            items.append({"name": name or "item", "qty": 1, "price": price})
        else:
            # no numbers, maybe product name only
            items.append({"name": clean, "qty": 0, "price": 0.0})

    return items


def parse_bill_image_bytes(img_bytes: bytes) -> Tuple[List[Dict], str]:
    """Attempt OCR on image bytes and parse into item dicts. Returns (items, raw_text).
    If OCR not available, raises RuntimeError with instructions.
    """
    Image, pytesseract = _safe_import_pil_tesseract()
    if Image is None or pytesseract is None:
        raise RuntimeError("pytesseract and Pillow required for bill OCR. Install 'pytesseract' and 'Pillow'.")

    from io import BytesIO
    buf = BytesIO(img_bytes)
    try:
        img = Image.open(buf).convert('L')
    except Exception as e:
        raise RuntimeError(f"Unable to open image: {e}")

    # optional basic threshold to improve OCR on many receipts
    try:
        bw = img.point(lambda x: 0 if x < 200 else 255, '1')
    except Exception:
        bw = img

    raw = pytesseract.image_to_string(bw)
    parsed = parse_text_lines(raw)
    return parsed, raw
