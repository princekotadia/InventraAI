from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routes import product_routes, sales, analytics, vision

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/demo only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(product_routes.router)
app.include_router(sales.router)
app.include_router(analytics.router)
app.include_router(vision.router)


@app.get("/")
def root():
    return {"message": "AI Inventory Backend Running 🚀"}