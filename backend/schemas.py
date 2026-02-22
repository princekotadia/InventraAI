from pydantic import BaseModel
from datetime import date
from typing import Optional

class ProductCreate(BaseModel):
    name: str
    cost_price: float
    selling_price: float
    current_stock: int
    expiry_date: Optional[date] = None


class SaleCreate(BaseModel):
    product_id: int
    quantity_sold: int
    sale_date: date