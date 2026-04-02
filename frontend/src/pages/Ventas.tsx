import { useState, useEffect } from "react";
import { ventasApi } from "../services/api";
import type { Venta, ResumenDiario, ResumenMensual, MetodoPago } from "../types/models";

const METODOS: { value: MetodoPago | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "efectivo", label: "Efectivo" },
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "punto_de_venta", label: "Punto de Venta" },
];

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  pago_movil: "Pago Móvil",
  punto_de_venta: "Punto de Venta",
};

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumen, setResumen] = useState<ResumenDiario | null>(null);
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual | null>(null);
  const [fechaDesde, setFechaDesde] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }));
  const [fechaHasta, setFechaHasta] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }));
  const [metodoFiltro, setMetodoFiltro] = useState<MetodoPago | "">("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const mesActual = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }).slice(0, 7);

  useEffect(() => {
    ventasApi
      .listar({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        metodo_pago: metodoFiltro || undefined,
      })
      .then(setVentas)
      .catch(() => {});

    ventasApi.resumenDiario(fechaDesde).then(setResumen).catch(() => {});
    ventasApi.resumenMensual(mesActual).then(setResumenMensual).catch(() => {});
  }, [fechaDesde, fechaHasta, metodoFiltro]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

      {/* Summary */}
      {resumen && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-500">Total ventas</p>
            <p className="text-2xl font-bold">{resumen.total_ventas}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-500">Total USD</p>
            <p className="text-2xl font-bold text-green-600">${resumen.total_usd.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-500">Total Bs</p>
            <p className="text-2xl font-bold text-blue-600">Bs {resumen.total_bs.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-500 mb-2">Por método de pago</p>
            {Object.entries(resumen.por_metodo_pago).map(([metodo, data]) => (
              <div key={metodo} className="flex justify-between text-sm">
                <span className="text-gray-600">{METODO_LABELS[metodo] || metodo}</span>
                <span className="font-medium">${data.total_usd.toFixed(2)} ({data.cantidad})</span>
              </div>
            ))}
            {Object.keys(resumen.por_metodo_pago).length === 0 && (
              <p className="text-xs text-gray-400">Sin ventas</p>
            )}
          </div>
        </div>
      )}

      {/* Monthly summary */}
      {resumenMensual && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Resumen del mes ({resumenMensual.mes})</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-indigo-100">
              <p className="text-sm text-gray-500">Ventas del mes</p>
              <p className="text-2xl font-bold">{resumenMensual.total_ventas}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-indigo-100">
              <p className="text-sm text-gray-500">Total USD del mes</p>
              <p className="text-2xl font-bold text-green-600">${resumenMensual.total_usd.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-indigo-100">
              <p className="text-sm text-gray-500">Total Bs del mes</p>
              <p className="text-2xl font-bold text-blue-600">Bs {resumenMensual.total_bs.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-indigo-100">
              <p className="text-sm text-gray-500 mb-2">Por método de pago</p>
              {Object.entries(resumenMensual.por_metodo_pago).map(([metodo, data]) => (
                <div key={metodo} className="flex justify-between text-sm">
                  <span className="text-gray-600">{METODO_LABELS[metodo] || metodo}</span>
                  <span className="font-medium">${data.total_usd.toFixed(2)} ({data.cantidad})</span>
                </div>
              ))}
              {Object.keys(resumenMensual.por_metodo_pago).length === 0 && (
                <p className="text-xs text-gray-400">Sin ventas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Método de pago</label>
          <select
            value={metodoFiltro}
            onChange={(e) => setMetodoFiltro(e.target.value as MetodoPago | "")}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {ventas.map((v) => (
          <div key={v.id} className="border-b last:border-0">
            <button
              onClick={() => setExpandido(expandido === v.id ? null : v.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {new Date(v.fecha).toLocaleString("es-VE", { timeZone: "America/Caracas" })}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {METODO_LABELS[v.metodo_pago] || v.metodo_pago}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-green-600">${v.total_usd.toFixed(2)}</span>
                <span className="text-sm text-gray-500">Bs {v.total_bs.toFixed(2)}</span>
                <span className="text-gray-400">{expandido === v.id ? "▲" : "▼"}</span>
              </div>
            </button>
            {expandido === v.id && (
              <div className="px-4 pb-3 bg-gray-50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">Producto</th>
                      <th className="text-center py-1">Cantidad</th>
                      <th className="text-right py-1">Precio</th>
                      <th className="text-right py-1">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1">{item.nombre_producto}</td>
                        <td className="py-1 text-center">{item.cantidad}</td>
                        <td className="py-1 text-right">${item.precio_unitario.toFixed(2)}</td>
                        <td className="py-1 text-right">${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-2">
                  Tasa BCV: {v.tasa_bcv.toFixed(2)} Bs/$
                </p>
              </div>
            )}
          </div>
        ))}
        {ventas.length === 0 && (
          <p className="text-center text-gray-400 py-8">No hay ventas en este período</p>
        )}
      </div>
    </div>
  );
}
