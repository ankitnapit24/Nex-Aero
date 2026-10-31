from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.routes import health, engine, prediction, alert

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Predictive maintenance intelligence for turbofan aircraft engines based on NASA C-MAPSS dataset.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_PREFIX, tags=["Health"])
app.include_router(engine.router, prefix=settings.API_PREFIX, tags=["Engines"])
app.include_router(prediction.router, prefix=settings.API_PREFIX, tags=["Predictions"])
app.include_router(alert.router, prefix=f"{settings.API_PREFIX}/alerts", tags=["Alerts"])

@app.get("/")
def root():
    return {
        "message": "Welcome to AeroGuard AI API. See /docs for interactive Swagger documentation.",
        "status": "healthy"
    }
