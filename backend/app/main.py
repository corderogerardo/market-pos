from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import productos, ventas, tasa_bcv, sync, deudas, licencia
from app.services import license_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    license_service.refrescar()
    yield


app = FastAPI(
    title="Market POS API",
    description="API para punto de venta de tienda de alimentos",
    version="1.0.0",
    lifespan=lifespan,
)

# Rutas siempre accesibles aunque no haya licencia (salud + activación + docs).
_RUTAS_LIBRES = ("/", "/licencia", "/docs", "/openapi.json", "/redoc")


@app.middleware("http")
async def control_licencia(request: Request, call_next):
    path = request.url.path
    libre = (
        request.method == "OPTIONS"
        or path == "/"
        or any(path == r or path.startswith(r + "/") or path.startswith(r) for r in _RUTAS_LIBRES if r != "/")
    )
    if libre or not license_service.enforcement_enabled() or license_service.licencia_activa():
        return await call_next(request)
    motivo = license_service.estado().get("motivo") or "Licencia requerida"
    return JSONResponse(
        status_code=403,
        content={"detail": motivo, "codigo": "LICENCIA_REQUERIDA"},
    )


# CORS se agrega después => queda como capa externa y también cubre el 403.
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
app.include_router(deudas.router, prefix="/deudas", tags=["Deudas"])
app.include_router(licencia.router, prefix="/licencia", tags=["Licencia"])


@app.get("/")
def root():
    return {"message": "Market POS API funcionando"}
