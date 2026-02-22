# Inventra AI — Frontend

This frontend is a Vite + React app that interfaces with the Inventra AI FastAPI backend.

## Quick start (frontend)

1. Install dependencies

```bash
cd frontend
npm install
```

2. Run dev server

```bash
npm run dev
```

The frontend dev server runs on `http://localhost:5173` by default.

## Quick start (backend)

The frontend expects the backend API to be available at:

- `http://127.0.0.1:8000`

To run the backend locally (from the `backend` folder):

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install fastapi uvicorn sqlalchemy pydantic
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Notes:
- If you maintain a `requirements.txt` you can instead run `pip install -r requirements.txt`.
- The frontend's API client uses `http://127.0.0.1:8000` (see `src/api/api.js`).

## Available Pages / Features

- Dashboard — application overview and key metrics.
- Add Product — create new products in the catalog.
- Add Sale — record sales for products.
- Products (Inventory) — table view of products with `selling_price`, cost and stock.
- Simulation — What‑If profit simulation (change price/stock and simulate revenue/profit).

## API endpoints the frontend calls

- `GET /analytics/risk` — product list / risk analysis used by `Products` table.
- `POST /analytics/simulate` — run profit simulation (body: `product_id`, `new_price`, `new_stock`).
- `POST /products/` — create product (backend route).
- `POST /sales/` — create sale (backend route).

If you change the backend host/port, update `src/api/api.js` `baseURL` accordingly.

## Troubleshooting

- If product price cells appear blank in the UI, confirm the backend returns `selling_price` in the product payload and that `src/pages/ProductTable.jsx` uses `selling_price`.
- If CORS issues appear, ensure the backend allows the frontend origin (development uses `allow_origins`="*").

## Contributing

Open a PR with a focused change. Run the frontend locally with `npm run dev` and the backend with `uvicorn main:app --reload` to test end-to-end.
