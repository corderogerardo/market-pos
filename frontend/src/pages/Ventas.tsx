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

const hoyCaracas = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const fmtMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  return capitalizar(
    new Date(y, m - 1, 1).toLocaleDateString("es-VE", {
      month: "long",
      year: "numeric",
    }),
  );
};

const fmtDia = (dia: string) => {
  const [y, m, d] = dia.split("-").map(Number);
  return capitalizar(
    new Date(y, m - 1, d).toLocaleDateString("es-VE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );
};

const stepMes = (mes: string, delta: number) => {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const rangoMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
};

// La fecha viene del backend ya normalizada a hora de Caracas (naive); se
// formatea desde el string para no reinterpretarla con la zona del navegador.
const fmtFechaHora = (iso: string) => {
  const [fecha, hora = ""] = iso.replace("T", " ").split(" ");
  const [Y, M, D] = fecha.split("-");
  return `${D}/${M}/${Y} ${hora.slice(0, 5)}`;
};

function TarjetasResumen({
  resumen,
  acento,
}: {
  resumen: ResumenDiario | ResumenMensual;
  acento: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className={`bg-white p-4 rounded-lg border ${acento}`}>
        <p className="text-sm text-gray-500">N° de ventas</p>
        <p className="text-2xl font-bold">{resumen.total_ventas}</p>
      </div>
      <div className={`bg-white p-4 rounded-lg border ${acento}`}>
        <p className="text-sm text-gray-500">Total USD</p>
        <p className="text-2xl font-bold text-green-600">
          ${resumen.total_usd.toFixed(2)}
        </p>
      </div>
      <div className={`bg-white p-4 rounded-lg border ${acento}`}>
        <p className="text-sm text-gray-500">Total Bs</p>
        <p className="text-2xl font-bold text-blue-600">
          Bs {resumen.total_bs.toFixed(2)}
        </p>
      </div>
      <div className={`bg-white p-4 rounded-lg border ${acento}`}>
        <p className="text-sm text-gray-500 mb-2">Por método de pago</p>
        {Object.entries(resumen.por_metodo_pago).map(([metodo, data]) => (
          <div key={metodo} className="flex justify-between text-sm">
            <span className="text-gray-600">{METODO_LABELS[metodo] || metodo}</span>
            <span className="font-medium">
              ${data.total_usd.toFixed(2)} ({data.cantidad})
            </span>
          </div>
        ))}
        {Object.keys(resumen.por_metodo_pago).length === 0 && (
          <p className="text-xs text-gray-400">Sin ventas</p>
        )}
      </div>
    </div>
  );
}

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumenDia, setResumenDia] = useState<ResumenDiario | null>(null);
  const [resumenMes, setResumenMes] = useState<ResumenMensual | null>(null);
  const [dia, setDia] = useState(hoyCaracas());
  const [mes, setMes] = useState(hoyCaracas().slice(0, 7));
  const [metodoFiltro, setMetodoFiltro] = useState<MetodoPago | "">("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const mesActual = hoyCaracas().slice(0, 7);

  useEffect(() => {
    ventasApi.resumenDiario(dia).then(setResumenDia).catch(() => setResumenDia(null));
  }, [dia]);

  useEffect(() => {
    ventasApi.resumenMensual(mes).then(setResumenMes).catch(() => setResumenMes(null));
    const { desde, hasta } = rangoMes(mes);
    ventasApi
      .listar({
        fecha_desde: desde,
        fecha_hasta: hasta,
        metodo_pago: metodoFiltro || undefined,
      })
      .then(setVentas)
      .catch(() => setVentas([]));
  }, [mes, metodoFiltro]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Ventas</h1>

      {/* Ventas del día */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">Ventas del día</h2>
          <input
            type="date"
            value={dia}
            max={hoyCaracas()}
            onChange={(e) => setDia(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          {dia !== hoyCaracas() && (
            <button
              onClick={() => setDia(hoyCaracas())}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
            >
              Ir a hoy
            </button>
          )}
          <span className="text-sm text-gray-500">{fmtDia(dia)}</span>
        </div>
        {resumenDia ? (
          <TarjetasResumen resumen={resumenDia} acento="border-gray-200" />
        ) : (
          <p className="text-gray-400 text-sm">Sin datos para este día</p>
        )}
      </section>

      {/* Ventas del mes */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">Ventas del mes</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMes(stepMes(mes, -1))}
              className="w-9 h-9 flex items-center justify-center border rounded-lg hover:bg-gray-50"
              title="Mes anterior"
            >
              ◀
            </button>
            <input
              type="month"
              value={mes}
              max={mesActual}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={() => setMes(stepMes(mes, 1))}
              disabled={mes >= mesActual}
              className="w-9 h-9 flex items-center justify-center border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Mes siguiente"
            >
              ▶
            </button>
          </div>
          <span className="text-base font-medium text-indigo-700">{fmtMes(mes)}</span>
          {mes !== mesActual && (
            <button
              onClick={() => setMes(mesActual)}
              className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
            >
              Mes actual
            </button>
          )}
        </div>
        {resumenMes ? (
          <TarjetasResumen resumen={resumenMes} acento="border-indigo-100" />
        ) : (
          <p className="text-gray-400 text-sm">Sin datos para este mes</p>
        )}
      </section>

      {/* Detalle de ventas del mes seleccionado */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Detalle — {fmtMes(mes)}{" "}
            <span className="text-sm font-normal text-gray-500">
              ({ventas.length} {ventas.length === 1 ? "venta" : "ventas"})
            </span>
          </h2>
          <select
            value={metodoFiltro}
            onChange={(e) => setMetodoFiltro(e.target.value as MetodoPago | "")}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          {ventas.map((v) => (
            <div key={v.id} className="border-b last:border-0">
              <button
                onClick={() => setExpandido(expandido === v.id ? null : v.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{fmtFechaHora(v.fecha)}</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100">
                    {METODO_LABELS[v.metodo_pago] || v.metodo_pago}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-green-600">
                    ${v.total_usd.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Bs {v.total_bs.toFixed(2)}
                  </span>
                  <span className="text-gray-400">
                    {expandido === v.id ? "▲" : "▼"}
                  </span>
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
                          <td className="py-1 text-right">
                            ${item.precio_unitario.toFixed(2)}
                          </td>
                          <td className="py-1 text-right">
                            ${item.subtotal.toFixed(2)}
                          </td>
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
            <p className="text-center text-gray-400 py-8">
              No hay ventas en {fmtMes(mes)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
