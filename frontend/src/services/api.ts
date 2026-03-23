import type {
  Producto,
  ProductoCreate,
  ProductoUpdate,
  Venta,
  VentaCreate,
  TasaBCV,
  ResumenDiario,
  SyncResponse,
  MetodoPago,
} from "../types/models";

const API_BASE = "http://localhost:8000";

/** Wait for the backend to be ready (retries up to ~30s). */
export async function waitForBackend(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // Backend not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Backend no disponible después de 30 segundos");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de red" }));
    throw new Error(error.detail || `Error ${response.status}`);
  }
  return response.json();
}

// Productos
export const productosApi = {
  listar: (params?: { activo?: boolean; categoria?: string }) => {
    const query = new URLSearchParams();
    if (params?.activo !== undefined) query.set("activo", String(params.activo));
    if (params?.categoria) query.set("categoria", params.categoria);
    const qs = query.toString();
    return request<Producto[]>(`/productos/${qs ? `?${qs}` : ""}`);
  },
  buscar: (q: string) => request<Producto[]>(`/productos/buscar?q=${encodeURIComponent(q)}`),
  buscarPorQR: (qr: string) => request<Producto>(`/productos/qr/${encodeURIComponent(qr)}`),
  obtener: (id: string) => request<Producto>(`/productos/${id}`),
  crear: (data: ProductoCreate) =>
    request<Producto>("/productos/", { method: "POST", body: JSON.stringify(data) }),
  actualizar: (id: string, data: ProductoUpdate) =>
    request<Producto>(`/productos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  eliminar: (id: string) => request<{ mensaje: string }>(`/productos/${id}`, { method: "DELETE" }),
};

// Ventas
export const ventasApi = {
  listar: (params?: { fecha_desde?: string; fecha_hasta?: string; metodo_pago?: MetodoPago }) => {
    const query = new URLSearchParams();
    if (params?.fecha_desde) query.set("fecha_desde", params.fecha_desde);
    if (params?.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
    if (params?.metodo_pago) query.set("metodo_pago", params.metodo_pago);
    const qs = query.toString();
    return request<Venta[]>(`/ventas/${qs ? `?${qs}` : ""}`);
  },
  crear: (data: VentaCreate) =>
    request<Venta>("/ventas/", { method: "POST", body: JSON.stringify(data) }),
  obtener: (id: string) => request<Venta>(`/ventas/${id}`),
  resumenDiario: (fecha?: string) => {
    const qs = fecha ? `?fecha=${fecha}` : "";
    return request<ResumenDiario>(`/ventas/resumen-diario${qs}`);
  },
};

// Tasa BCV
export const tasaBcvApi = {
  actual: () => request<TasaBCV>("/tasa-bcv/"),
  actualizar: () => request<TasaBCV>("/tasa-bcv/actualizar", { method: "POST" }),
  manual: (tasa: number) =>
    request<TasaBCV>("/tasa-bcv/manual", { method: "POST", body: JSON.stringify({ tasa }) }),
  historial: () => request<TasaBCV[]>("/tasa-bcv/historial"),
};

// Sync
export const syncApi = {
  backup: () => request<SyncResponse>("/sync/backup", { method: "POST" }),
  restore: () => request<SyncResponse>("/sync/restore", { method: "POST" }),
  historial: () => request<SyncResponse[]>("/sync/historial"),
};
