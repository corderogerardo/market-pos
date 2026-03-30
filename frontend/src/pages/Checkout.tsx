import { useState, useEffect, useRef, useCallback } from "react";
import { productosApi, ventasApi } from "../services/api";
import type { Producto, CartItem, MetodoPago, TasaBCV } from "../types/models";
import QrScanner from "../components/QrScanner";

interface Props {
  tasaBcv: TasaBCV | null;
  onTasaUpdate: (t: TasaBCV) => void;
}

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "punto_de_venta", label: "Punto de Venta" },
];

export default function Checkout({ tasaBcv }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [mostrarQR, setMostrarQR] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [bsInputs, setBsInputs] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Search products
  useEffect(() => {
    if (busqueda.length < 1) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(() => {
      productosApi.buscar(busqueda).then(setResultados).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  const getCantidadInicial = (producto: Producto) => {
    if (producto.tipo_venta === "unidad") return 1;
    if (producto.unidad === "g" || producto.unidad === "ml") return 100;
    return 1;
  };

  const getIncremento = (producto: Producto) => {
    if (producto.tipo_venta === "unidad") return 1;
    if (producto.unidad === "g" || producto.unidad === "ml") return 100;
    if (producto.unidad === "kg" || producto.unidad === "l" || producto.unidad === "lb") return 0.5;
    return 1;
  };

  const agregarAlCarrito = useCallback((producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        const inc = getIncremento(producto);
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + inc } : i
        );
      }
      return [...prev, { producto, cantidad: getCantidadInicial(producto) }];
    });
    setBusqueda("");
    setResultados([]);
    inputRef.current?.focus();
  }, []);

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    // Clear Bs override when quantity changes directly
    setBsInputs((prev) => {
      const next = { ...prev };
      delete next[productoId];
      return next;
    });
    if (cantidad <= 0) {
      setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));
    } else {
      setCarrito((prev) =>
        prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad } : i))
      );
    }
  };

  const actualizarDesdeBS = (productoId: string, bsValue: string) => {
    setBsInputs((prev) => ({ ...prev, [productoId]: bsValue }));
    const bs = parseFloat(bsValue);
    if (!isNaN(bs) && bs > 0 && tasaBcv) {
      const item = carrito.find((i) => i.producto.id === productoId);
      if (!item) return;
      const precioEnBs = item.producto.precio * tasaBcv.tasa;
      let nuevaCantidad = bs / precioEnBs;
      if (item.producto.tipo_venta === "unidad") {
        nuevaCantidad = Math.max(1, Math.round(nuevaCantidad));
      } else {
        nuevaCantidad = parseFloat(nuevaCantidad.toFixed(2));
      }
      if (nuevaCantidad > 0) {
        setCarrito((prev) =>
          prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad: nuevaCantidad } : i))
        );
      }
    }
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));
    setBsInputs((prev) => {
      const next = { ...prev };
      delete next[productoId];
      return next;
    });
  };

  const totalUSD = carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  const totalBS = tasaBcv ? totalUSD * tasaBcv.tasa : 0;

  const cobrar = async () => {
    if (carrito.length === 0 || !tasaBcv) return;
    setProcesando(true);
    setError("");
    try {
      await ventasApi.crear({
        items: carrito.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
        metodo_pago: metodoPago,
        tasa_bcv: tasaBcv.tasa,
      });
      setCarrito([]);
      setBsInputs({});
      setMensaje("Venta registrada exitosamente");
      setTimeout(() => setMensaje(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar la venta");
    } finally {
      setProcesando(false);
    }
  };

  const onQrDetected = useCallback((code: string) => {
    setMostrarQR(false);
    productosApi
      .buscarPorQR(code)
      .then(agregarAlCarrito)
      .catch(() => setError(`Producto con QR "${code}" no encontrado`));
  }, [agregarAlCarrito]);

  const getBsDisplay = (item: CartItem) => {
    if (bsInputs[item.producto.id] !== undefined) return bsInputs[item.producto.id];
    if (!tasaBcv) return "";
    return (item.cantidad * item.producto.precio * tasaBcv.tasa).toFixed(2);
  };

  return (
    <div className="flex h-full">
      {/* Left: Product search + cart */}
      <div className="flex-1 flex flex-col p-4">
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => setMostrarQR(!mostrarQR)}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {mostrarQR ? "Cerrar" : "📷 QR"}
          </button>
        </div>

        {/* QR Scanner */}
        {mostrarQR && <QrScanner onDetected={onQrDetected} />}

        {/* Search results */}
        {resultados.length > 0 && (
          <div className="mb-4 border border-gray-200 rounded-lg max-h-48 overflow-auto bg-white shadow-sm">
            {resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarAlCarrito(p)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex justify-between items-center border-b border-gray-100 last:border-0"
              >
                <div>
                  <span className="font-medium">{p.nombre}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {p.tipo_venta === "unidad" ? "und" : p.unidad}
                  </span>
                  {p.inventario !== null && (
                    <span className={`ml-2 text-xs ${p.inventario <= 0 ? "text-red-500" : "text-gray-400"}`}>
                      (inv: {p.inventario} {p.tipo_venta === "unidad" ? "und" : p.unidad})
                    </span>
                  )}
                </div>
                <span className="text-green-600 font-semibold">${p.precio.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {mensaje && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
            {mensaje}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-500">✕</button>
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 overflow-auto">
          {carrito.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Escanea un QR o busca un producto para comenzar</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-sm text-gray-600">Producto</th>
                  <th className="text-center px-3 py-2 text-sm text-gray-600">Cantidad</th>
                  <th className="text-center px-3 py-2 text-sm text-gray-600">Bs</th>
                  <th className="text-right px-3 py-2 text-sm text-gray-600">Precio</th>
                  <th className="text-right px-3 py-2 text-sm text-gray-600">Subtotal</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => {
                  const isUnidad = item.producto.tipo_venta === "unidad";
                  const unidadLabel = isUnidad ? "und" : item.producto.unidad;
                  const incremento = getIncremento(item.producto);
                  const step = isUnidad ? 1 : (item.producto.unidad === "g" || item.producto.unidad === "ml" ? 50 : 0.1);

                  return (
                    <tr key={item.producto.id} className="border-b border-gray-100">
                      <td className="px-3 py-3">
                        <div className="font-medium">{item.producto.nombre}</div>
                        {item.producto.inventario !== null && (
                          <div className={`text-xs ${item.producto.inventario - item.cantidad < 0 ? "text-red-500" : "text-gray-400"}`}>
                            Inv: {item.producto.inventario} {unidadLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => actualizarCantidad(item.producto.id, item.cantidad - incremento)}
                            className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                          >
                            -
                          </button>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  actualizarCantidad(item.producto.id, isUnidad ? Math.round(val) : val);
                                }
                              }}
                              className="w-16 text-center border rounded px-1 py-0.5 text-sm"
                              step={step}
                              min={isUnidad ? 1 : 0.1}
                            />
                            <span className="text-xs text-gray-500">{unidadLabel}</span>
                          </div>
                          <button
                            onClick={() => actualizarCantidad(item.producto.id, item.cantidad + incremento)}
                            className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {tasaBcv && (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={getBsDisplay(item)}
                              onChange={(e) => actualizarDesdeBS(item.producto.id, e.target.value)}
                              onBlur={() => {
                                setBsInputs((prev) => {
                                  const next = { ...prev };
                                  delete next[item.producto.id];
                                  return next;
                                });
                              }}
                              className="w-20 text-center border rounded px-1 py-0.5 text-sm"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-xs text-gray-500">Bs</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">${item.producto.precio.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-semibold">
                        ${(item.producto.precio * item.cantidad).toFixed(2)}
                      </td>
                      <td className="px-2">
                        <button
                          onClick={() => eliminarDelCarrito(item.producto.id)}
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
          )}
        </div>
      </div>

      {/* Right: Payment panel */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col p-4">
        <h2 className="text-lg font-bold mb-4">Resumen</h2>

        <div className="space-y-3 flex-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal USD</span>
            <span className="font-semibold">${totalUSD.toFixed(2)}</span>
          </div>
          {tasaBcv && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tasa BCV</span>
                <span>{tasaBcv.tasa.toFixed(2)} Bs/$</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Bs</span>
                <span className="font-semibold">Bs {totalBS.toFixed(2)}</span>
              </div>
            </>
          )}

          <hr className="my-4" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de pago
            </label>
            <div className="space-y-2">
              {METODOS_PAGO.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    metodoPago === m.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo_pago"
                    value={m.value}
                    checked={metodoPago === m.value}
                    onChange={() => setMetodoPago(m.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-xl font-bold mb-4">
            <span>Total</span>
            <span className="text-green-600">${totalUSD.toFixed(2)}</span>
          </div>
          <button
            onClick={cobrar}
            disabled={carrito.length === 0 || !tasaBcv || procesando}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {procesando ? "Procesando..." : "Cobrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
