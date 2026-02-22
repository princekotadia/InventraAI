Deployment guide — Free-tier friendly

Overview
 - Backend: FastAPI app in `backend/` — recommended deploy targets: Render (free plan), Railway, Fly, or Heroku alternatives.
 - Frontend: Vite React app in `frontend/` — recommended: Vercel or Netlify or Cloudflare Pages.

Backend (Render example)
1. Create a new Web Service on Render (or Railway).
2. Connect your GitHub repo and choose the `backend/` folder as the service root.
3. Set the build command:

```
pip install -r requirements.txt
```

4. Set the start command (Render provides $PORT env var):

```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

5. Add environment variables for the service:
 - `DATABASE_URL`: a Postgres URL (recommended) or leave empty to use default SQLite file (not durable on many hosts).
 - `OPENAI_API_KEY`: optional, to enable GPT-generated insights.
 - `OPENAI_MODEL`: optional (e.g. `gpt-4o-mini`).

6. If using Postgres, create a managed Postgres database on Render and copy its connection string into `DATABASE_URL`.
7. Deploy. The service will expose a stable URL (e.g. `https://your-app.onrender.com`).

Frontend (Vercel / Netlify)
1. Deploy the `frontend/` folder to Vercel/Netlify.
2. In the frontend project settings, set an environment variable `VITE_BACKEND_URL` to your deployed backend base URL (e.g. `https://your-app.onrender.com`).
3. Build command: `npm install && npm run build`. Publish directory: `dist`.

Notes on DB persistence
 - SQLite stored on the filesystem is not durable on many free hosts (ephemeral). Use a managed Postgres (Render, Railway, Supabase) and set `DATABASE_URL` accordingly.
 - You may need to re-run local schema creation or migrations if switching DBs. Consider adding Alembic for migration scripts.

Testing locally before deploy
 - Backend: from `backend/` run:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

 - Frontend: from `frontend/` run:

```
npm install
npm run dev
```

Security
 - Never commit `OPENAI_API_KEY` or DB credentials. Use the host's secret/env settings.
