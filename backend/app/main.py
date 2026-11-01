from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.database.session import Base, engine
from backend.app.api.routes import health, engine as engine_router, prediction, alert

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nex_aero")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist safely
    logger.info("Initializing Nex Aero database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Nex Aero application startup complete.")
    yield
    # Shutdown
    logger.info("Nex Aero application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Predictive maintenance intelligence for turbofan aircraft engines based on NASA C-MAPSS dataset.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes with prefix
app.include_router(health.router, prefix=settings.API_PREFIX, tags=["Health"])
app.include_router(engine_router.router, prefix=settings.API_PREFIX, tags=["Engines"])
app.include_router(prediction.router, prefix=settings.API_PREFIX, tags=["Predictions"])
app.include_router(alert.router, prefix=f"{settings.API_PREFIX}/alerts", tags=["Alerts"])

# Direct root-level probes for platform health checkers
app.include_router(health.router, tags=["Health Direct"])

@app.get("/")
def root():
    return {
        "message": "Welcome to Nex Aero API. See /docs for interactive Swagger documentation.",
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
