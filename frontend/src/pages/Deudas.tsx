import { useState, useEffect } from "react";
import { deudasApi, productosApi, tasaBcvApi } from "../services/api";
import type { Deuda, Producto, MetodoPago } from "../types/models";

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "punto_de_venta", label: "Punto de Venta" },
];

interface BuilderItem {
  key: string;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  unidad: string;
  tipo_venta: string;
}

const nuevoKey = () => Math.random().toString(36).slice(2);

function pasoCantidad(unidad: string, tipo_venta: string): number {
  if (tipo_venta === "unidad") return 1;
  if (unidad === "g" || unidad === "ml") return 50;
  return 0.5;
}

function cantidadInicial(unidad: string, tipo_venta: string): number {
  if (tipo_venta === "unidad") return 1;
  if (unidad === "g" || unidad === "ml") return 100;
  return 1;
}

export default function Deudas() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [tasa, setTasa] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);
  const [saldando, setSaldando] = useState<string | null>(null);
  const [procesandoSaldo, setProcesandoSaldo] = useState(false);

  // Modal state: "nueva" | { agregarA: Deuda } | { editar: Deuda } | null
  const [modal, setModal] = useState<
    null | { tipo: "nueva" } | { tipo: "agregar"; deuda: Deuda } | { tipo: "editar"; deuda: Deuda }
  >(null);

  const [formCliente, setFormCliente] = useState("");
  const [formNota, setFormNota] = useState("");
  const [items, setItems] = useState<BuilderItem[]>([]);

  // Product search inside the builder
  const [busquedaProd, setBusquedaProd] = useState("");
  const [resultadosProd, setResultadosProd] = useState<Producto[]>([]);

  // Manual product entry
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState("1");
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    deudasApi.listar().then(setDeudas).catch(() => {});
  };

  useEffect(() => {
    cargar();
    tasaBcvApi
      .actual()
      .then((t) => setTasa(t.tasa))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (busquedaProd.length < 1) {
      setResultadosProd([]);
      return;
    }
    const t = setTimeout(() => {
      productosApi.buscar(busquedaProd).then(setResultadosProd).catch(() => setResultadosProd([]));
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaProd]);

  const deudasFiltradas = busqueda
    ? deudas.filter((d) => d.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()))
    : deudas;

  const totalAdeudado = deudas.reduce((s, d) => s + d.total_usd, 0);

  const resetModal = () => {
    setModal(null);
    setFormCliente("");
    setFormNota("");
    setItems([]);
    setBusquedaProd("");
    setResultadosProd([]);
    setManualNombre("");
    setManualPrecio("");
    setManualCantidad("1");
    setError("");
  };

  const abrirNueva = () => {
    resetModal();
    setModal({ tipo: "nueva" });
  };

  const abrirAgregar = (deuda: Deuda) => {
    resetModal();
    setModal({ tipo: "agregar", deuda });
  };

  const abrirEditar = (deuda: Deuda) => {
    resetModal();
    setFormCliente(deuda.nombre_cliente);
    setFormNota(deuda.nota ?? "");
    setModal({ tipo: "editar", deuda });
  };

  const agregarProductoABuilder = (p: Producto) => {
    setItems((prev) => [
      ...prev,
      {
        key: nuevoKey(),
        producto_id: p.id,
        nombre_producto: p.nombre,
        cantidad: cantidadInicial(p.unidad, p.tipo_venta),
        precio_unitario: p.precio,
        unidad: p.unidad,
        tipo_venta: p.tipo_venta,
      },
    ]);
    setBusquedaProd("");
    setResultadosProd([]);
  };

  const agregarManualABuilder = () => {
    const precio = parseFloat(manualPrecio);
    const cant = parseFloat(manualCantidad);
    if (!manualNombre.trim() || isNaN(precio) || precio < 0 || isNaN(cant) || cant <= 0) {
      setError("Completa nombre, precio y cantidad válidos para el producto manual");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        key: nuevoKey(),
        producto_id: null,
        nombre_producto: manualNombre.trim(),
        cantidad: cant,
        precio_unitario: precio,
        unidad: "und",
        tipo_venta: "unidad",
      },
    ]);
    setManualNombre("");
    setManualPrecio("");
    setManualCantidad("1");
    setError("");
  };

  const actualizarItem = (key: string, campo: "cantidad" | "precio_unitario", valor: number) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, [campo]: valor } : it)),
    );
  };

  const quitarItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const totalBuilder = items.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);

  const guardarNueva = async () => {
    if (!formCliente.trim()) {
      setError("Ingresa el nombre del cliente");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un producto a la deuda");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await deudasApi.crear({
        nombre_cliente: formCliente.trim(),
        nota: formNota.trim() || undefined,
        items: items.map((it) => ({
          producto_id: it.producto_id,
          nombre_producto: it.nombre_producto,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
      });
      resetModal();
      cargar();
      setMensaje("Deuda registrada");
      setTimeout(() => setMensaje(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la deuda");
    } finally {
      setGuardando(false);
    }
  };

  const guardarAgregar = async (deuda: Deuda) => {
    if (items.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      for (const it of items) {
        await deudasApi.agregarItem(deuda.id, {
          producto_id: it.producto_id,
          nombre_producto: it.nombre_producto,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        });
      }
      resetModal();
      cargar();
      setMensaje("Productos agregados a la deuda");
      setTimeout(() => setMensaje(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar productos");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEditar = async (deuda: Deuda) => {
    if (!formCliente.trim()) {
      setError("Ingresa el nombre del cliente");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await deudasApi.actualizar(deuda.id, {
        nombre_cliente: formCliente.trim(),
        nota: formNota.trim(),
      });
      resetModal();
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setGuardando(false);
    }
  };

  const marcarPagado = async (deudaId: string, itemId: string) => {
    try {
      const actualizada = await deudasApi.eliminarItem(deudaId, itemId);
      setDeudas((prev) => prev.map((d) => (d.id === deudaId ? actualizada : d)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al marcar como pagado");
    }
  };

  const saldarDeuda = async (deuda: Deuda, metodo: MetodoPago) => {
    if (!tasa) {
      setError("No hay tasa BCV disponible para registrar la venta");
      return;
    }
    setProcesandoSaldo(true);
    setError("");
    try {
      await deudasApi.saldar(deuda.id, { metodo_pago: metodo, tasa_bcv: tasa });
      setSaldando(null);
      setExpandido(null);
      cargar();
      setMensaje(`Deuda de ${deuda.nombre_cliente} saldada y registrada como venta`);
      setTimeout(() => setMensaje(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al saldar la deuda");
    } finally {
      setProcesandoSaldo(false);
    }
  };

  const eliminarDeuda = async (id: string) => {
    try {
      await deudasApi.eliminar(id);
      setConfirmandoEliminar(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar la deuda");
    }
  };

  const fmtFecha = (f: string) =>
    new Date(f).toLocaleDateString("es-VE", {
      timeZone: "America/Caracas",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const renderItemBuilder = () => (
    <div className="space-y-3">
      {/* Product search from catalog */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">Buscar producto del catálogo</label>
        <input
          type="text"
          value={busquedaProd}
          onChange={(e) => setBusquedaProd(e.target.value)}
          placeholder="Nombre o código del producto..."
          className="w-full px-3 py-2 border rounded-lg"
        />
        {resultadosProd.length > 0 && (
          <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-auto bg-white shadow-sm">
            {resultadosProd.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregarProductoABuilder(p)}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex justify-between items-center border-b border-gray-100 last:border-0"
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-green-600 font-semibold">${p.precio.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual product */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-600 mb-2">O agregar producto manual</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualNombre}
            onChange={(e) => setManualNombre(e.target.value)}
            placeholder="Producto"
            className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
          />
          <input
            type="number"
            value={manualPrecio}
            onChange={(e) => setManualPrecio(e.target.value)}
            placeholder="$ precio"
            className="w-24 px-2 py-1.5 border rounded-lg text-sm"
            step="0.01"
            min="0"
          />
          <input
            type="number"
            value={manualCantidad}
            onChange={(e) => setManualCantidad(e.target.value)}
            placeholder="Cant."
            className="w-20 px-2 py-1.5 border rounded-lg text-sm"
            step="0.1"
            min="0"
          />
          <button
            type="button"
            onClick={agregarManualABuilder}
            className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800"
          >
            +
          </button>
        </div>
      </div>

      {/* Selected items */}
      {items.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-600">Producto</th>
                <th className="text-center px-2 py-2 text-gray-600">Precio</th>
                <th className="text-center px-2 py-2 text-gray-600">Cantidad</th>
                <th className="text-right px-3 py-2 text-gray-600">Subtotal</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const step = pasoCantidad(it.unidad, it.tipo_venta);
                const unidadLabel = it.tipo_venta === "unidad" ? "und" : it.unidad;
                return (
                  <tr key={it.key} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{it.nombre_producto}</td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          value={it.precio_unitario}
                          onChange={(e) =>
                            actualizarItem(it.key, "precio_unitario", parseFloat(e.target.value) || 0)
                          }
                          className="w-20 text-center border rounded px-1 py-0.5"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            actualizarItem(
                              it.key,
                              "cantidad",
                              Math.max(step, parseFloat((it.cantidad - step).toFixed(2))),
                            )
                          }
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={it.cantidad}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v > 0) actualizarItem(it.key, "cantidad", v);
                          }}
                          className="w-16 text-center border rounded px-1 py-0.5"
                          step={step}
                          min={step}
                        />
                        <span className="text-xs text-gray-500">{unidadLabel}</span>
                        <button
                          type="button"
                          onClick={() =>
                            actualizarItem(
                              it.key,
                              "cantidad",
                              parseFloat((it.cantidad + step).toFixed(2)),
                            )
                          }
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ${(it.precio_unitario * it.cantidad).toFixed(2)}
                    </td>
                    <td className="px-2">
                      <button
                        type="button"
                        onClick={() => quitarItem(it.key)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-between px-3 py-2 bg-gray-50 border-t border-gray-200 font-semibold">
            <span>Total</span>
            <span className="text-green-600">
              ${totalBuilder.toFixed(2)}
              {tasa && (
                <span className="text-gray-500 font-normal ml-2">
                  Bs {(totalBuilder * tasa).toFixed(2)}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Deudas</h1>
        <button
          onClick={abrirNueva}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nueva deuda
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Clientes con deuda</p>
          <p className="text-2xl font-bold">{deudas.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total adeudado USD</p>
          <p className="text-2xl font-bold text-red-600">${totalAdeudado.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total adeudado Bs</p>
          <p className="text-2xl font-bold text-blue-600">
            {tasa ? `Bs ${(totalAdeudado * tasa).toFixed(2)}` : "—"}
          </p>
        </div>
      </div>

      {mensaje && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
          {mensaje}
        </div>
      )}
      {error && !modal && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500">
            ✕
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar cliente por nombre..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
      />

      {/* Debts list */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {deudasFiltradas.map((d) => (
          <div key={d.id} className="border-b last:border-0">
            <button
              onClick={() => setExpandido(expandido === d.id ? null : d.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <span className="font-semibold">{d.nombre_cliente}</span>
                {d.nota && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                    {d.nota}
                  </span>
                )}
                <span className="text-xs text-gray-400">{fmtFecha(d.creado_en)}</span>
                {d.items.length === 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                    Saldada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-red-600">${d.total_usd.toFixed(2)}</span>
                {tasa && (
                  <span className="text-sm text-gray-500">Bs {(d.total_usd * tasa).toFixed(2)}</span>
                )}
                <span className="text-gray-400">{expandido === d.id ? "▲" : "▼"}</span>
              </div>
            </button>

            {expandido === d.id && (
              <div className="px-4 pb-4 bg-gray-50">
                {d.items.length > 0 ? (
                  <table className="w-full text-sm mb-3">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-1">Producto</th>
                        <th className="text-center py-1">Cantidad</th>
                        <th className="text-right py-1">Precio</th>
                        <th className="text-right py-1">Subtotal</th>
                        <th className="text-right py-1">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-200">
                          <td className="py-2">{item.nombre_producto}</td>
                          <td className="py-2 text-center">{item.cantidad}</td>
                          <td className="py-2 text-right">${item.precio_unitario.toFixed(2)}</td>
                          <td className="py-2 text-right font-medium">
                            ${item.subtotal.toFixed(2)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => marcarPagado(d.id, item.id)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              ✓ Pagado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-gray-400 py-4">
                    No quedan productos por pagar
                  </p>
                )}

                {d.items.length > 0 && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    {saldando === d.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-green-800">
                          ¿Cómo pagó {d.nombre_cliente}?
                        </span>
                        {METODOS_PAGO.map((m) => (
                          <button
                            key={m.value}
                            disabled={procesandoSaldo}
                            onClick={() => saldarDeuda(d, m.value)}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                          >
                            {m.label}
                          </button>
                        ))}
                        <button
                          disabled={procesandoSaldo}
                          onClick={() => setSaldando(null)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-green-800">
                          Cuando el cliente pague todo, se registra como venta.
                        </span>
                        <button
                          onClick={() => {
                            setSaldando(d.id);
                            setError("");
                          }}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                        >
                          ✓ Pagar todo y registrar venta
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirAgregar(d)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Agregar producto
                  </button>
                  <button
                    onClick={() => abrirEditar(d)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Editar
                  </button>
                  {confirmandoEliminar === d.id ? (
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">¿Eliminar deuda completa?</span>
                      <button
                        onClick={() => eliminarDeuda(d.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmandoEliminar(null)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmandoEliminar(d.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 ml-auto"
                    >
                      Eliminar deuda
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {deudasFiltradas.length === 0 && (
          <p className="text-center text-gray-400 py-8">No hay deudas registradas</p>
        )}
      </div>

      {/* Modal: nueva / agregar / editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-bold mb-4">
              {modal.tipo === "nueva" && "Nueva deuda"}
              {modal.tipo === "agregar" && `Agregar productos — ${modal.deuda.nombre_cliente}`}
              {modal.tipo === "editar" && "Editar deuda"}
            </h2>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            {(modal.tipo === "nueva" || modal.tipo === "editar") && (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={formCliente}
                  onChange={(e) => setFormCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  value={formNota}
                  onChange={(e) => setFormNota(e.target.value)}
                  placeholder="Nota (opcional): teléfono, fecha de pago..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            {(modal.tipo === "nueva" || modal.tipo === "agregar") && renderItemBuilder()}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resetModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                disabled={guardando}
                onClick={() => {
                  if (modal.tipo === "nueva") guardarNueva();
                  else if (modal.tipo === "agregar") guardarAgregar(modal.deuda);
                  else guardarEditar(modal.deuda);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {guardando
                  ? "Guardando..."
                  : modal.tipo === "nueva"
                  ? "Crear deuda"
                  : modal.tipo === "agregar"
                  ? "Agregar productos"
                  : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
