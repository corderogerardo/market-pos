export type MetodoPago = "efectivo" | "pago_movil" | "punto_de_venta";

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  peso: number | null;
  unidad: string;
  qr_code: string | null;
  categoria: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface ProductoCreate {
  nombre: string;
  precio: number;
  peso?: number;
  unidad?: string;
  qr_code?: string;
  categoria?: string;
}

export interface ProductoUpdate {
  nombre?: string;
  precio?: number;
  peso?: number;
  unidad?: string;
  qr_code?: string;
  categoria?: string;
  activo?: boolean;
}

export interface VentaItem {
  id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  fecha: string;
  total_usd: number;
  tasa_bcv: number;
  total_bs: number;
  metodo_pago: MetodoPago;
  items: VentaItem[];
}

export interface VentaCreate {
  items: { producto_id: string; cantidad: number }[];
  metodo_pago: MetodoPago;
  tasa_bcv: number;
}

export interface TasaBCV {
  id: string;
  fecha: string;
  tasa: number;
  consultado_en: string;
}

export interface ResumenDiario {
  fecha: string;
  total_ventas: number;
  total_usd: number;
  total_bs: number;
  por_metodo_pago: Record<string, { total_usd: number; total_bs: number; cantidad: number }>;
}

export interface ResumenMensual {
  mes: string;
  total_ventas: number;
  total_usd: number;
  total_bs: number;
  por_metodo_pago: Record<string, { total_usd: number; total_bs: number; cantidad: number }>;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface SyncResponse {
  id: string;
  fecha: string;
  estado: string;
  detalles: string | null;
}
