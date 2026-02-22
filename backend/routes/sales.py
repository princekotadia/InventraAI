from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from database import SessionLocal
import models, schemas

router = APIRouter(prefix="/sales", tags=["Sales"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)):
    # Validate product exists
    product = db.query(models.Product).filter(models.Product.id == sale.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Validate stock availability
    if sale.quantity_sold < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="quantity_sold must be non-negative")

    if sale.quantity_sold > product.current_stock:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock for sale")

    # Create sale record and decrement product stock
    db_sale = models.Sale(**sale.dict())
    db.add(db_sale)

    product.current_stock = product.current_stock - sale.quantity_sold
    db.add(product)

    db.commit()
    db.refresh(db_sale)
    return db_sale


@router.post("/upload_csv")
def upload_sales_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CSV with columns: product_id OR product_name, quantity_sold, sale_date (YYYY-MM-DD).
    If product_name is provided and not found, a new product will be created with zero prices.
    """
    import csv
    import io
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    updated = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        try:
            prod = None
            if row.get("product_id"):
                try:
                    pid = int(row.get("product_id"))
                    prod = db.query(models.Product).filter(models.Product.id == pid).first()
                except ValueError:
                    prod = None

            if not prod and row.get("product_name"):
                prod = db.query(models.Product).filter(models.Product.name == row.get("product_name")).first()
                if not prod:
                    # create lightweight product
                    # parse optional expiry_date
                    expiry = None
                    try:
                        ed = row.get("expiry_date")
                        if ed:
                            from datetime import date
                            expiry = date.fromisoformat(ed)
                    except Exception:
                        expiry = None

                    prod = models.Product(
                        name=row.get("product_name"),
                        cost_price=float(row.get("cost_price") or 0),
                        selling_price=float(row.get("selling_price") or 0),
                        current_stock=int(row.get("current_stock") or 0),
                        expiry_date=expiry
                    )
                    db.add(prod)
                    db.commit()
                    db.refresh(prod)
                    created += 1

            if not prod:
                errors.append(f"Row {idx}: product not found or invalid")
                continue

            qty = int(row.get("quantity_sold") or 0)
            sd = row.get("sale_date")
            from datetime import datetime
            sale_date = datetime.fromisoformat(sd).date() if sd else None

            db_sale = models.Sale(product_id=prod.id, quantity_sold=qty, sale_date=sale_date)
            db.add(db_sale)

            # decrement stock if possible
            try:
                prod.current_stock = max(0, (prod.current_stock or 0) - qty)
            except Exception:
                prod.current_stock = prod.current_stock

            db.add(prod)
            db.commit()
            updated += 1

        except Exception as e:
            db.rollback()
            errors.append(f"Row {idx}: {str(e)}")

    return {"created_products": created, "sales_imported": updated, "errors": errors}

@router.get("/")
def get_sales(db: Session = Depends(get_db)):
    return db.query(models.Sale).all()