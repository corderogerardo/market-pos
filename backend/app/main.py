from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import productos, ventas, tasa_bcv, sync


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Market POS API",
    description="API para punto de venta de tienda de alimentos",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(productos.router, prefix="/productos", tags=["Productos"])
app.include_router(ventas.router, prefix="/ventas", tags=["Ventas"])
app.include_router(tasa_bcv.router, prefix="/tasa-bcv", tags=["Tasa BCV"])
app.include_router(sync.router, prefix="/sync", tags=["Sincronización"])


@app.get("/")
def root():
    return {"message": "Market POS API funcionando"}
