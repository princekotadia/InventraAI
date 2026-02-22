from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from services.vision_service import parse_bill_image_bytes

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post('/vision/parse_bill')
async def parse_bill(mode: str = Form('purchase'), file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Parse a vendor bill image.
    mode: 'purchase' (bill where vendor provides cost/stock) or 'sale' (selling bill).
    Returns parsed items and applies changes to DB: create/update products for purchases,
    or create Sale rows and decrement stock for sales.
    """
    try:
        body = await file.read()
        items, raw = parse_bill_image_bytes(body)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

    results = []
    from datetime import date
    for it in items:
        name = (it.get('name') or '').strip()
        qty = int(it.get('qty') or 0)
        price = float(it.get('price') or 0.0)

        if not name:
            continue

        # purchase: create/update product with cost_price and increase stock
        if mode == 'purchase':
            prod = db.query(models.Product).filter(models.Product.name == name).first()
            if not prod:
                prod = models.Product(name=name, cost_price=price, selling_price=None, current_stock=qty)
                db.add(prod)
                db.commit()
                db.refresh(prod)
                results.append({'action': 'created', 'product': prod.name, 'id': prod.id, 'qty': qty, 'cost_price': price})
            else:
                prod.cost_price = price
                prod.current_stock = (prod.current_stock or 0) + qty
                db.add(prod)
                db.commit()
                results.append({'action': 'updated', 'product': prod.name, 'id': prod.id, 'qty_added': qty, 'new_stock': prod.current_stock})

        else:  # sale
            prod = db.query(models.Product).filter(models.Product.name == name).first()
            if not prod:
                # If product does not exist, create minimal product with unknown cost
                prod = models.Product(name=name, cost_price=0.0, selling_price=price, current_stock=0)
                db.add(prod)
                db.commit()
                db.refresh(prod)

            sold_qty = qty or 1
            # create sale
            sale = models.Sale(product_id=prod.id, quantity_sold=sold_qty, sale_date=date.today())
            db.add(sale)
            # decrement stock safely
            prod.current_stock = max(0, (prod.current_stock or 0) - sold_qty)
            # update selling price if provided
            if price and price > 0:
                prod.selling_price = price
            db.commit()
            results.append({'action': 'sold', 'product': prod.name, 'id': prod.id, 'qty_sold': sold_qty, 'new_stock': prod.current_stock})

    return {'items': results, 'raw_ocr': raw}
