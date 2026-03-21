import { useState, useEffect } from "react";
import { productosApi } from "../services/api";
import type { Producto, ProductoCreate } from "../types/models";

const CATEGORIAS = ["granos", "lácteos", "carnes", "frutas", "verduras", "bebidas", "aceites", "otros"];

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductoCreate>({
    nombre: "",
    precio: 0,
    peso: undefined,
    unidad: "kg",
    qr_code: "",
    categoria: "",
  });

  const cargarProductos = () => {
    productosApi
      .listar({ activo: true, categoria: categoriaFiltro || undefined })
      .then(setProductos)
      .catch(() => {});
  };

  useEffect(() => {
    cargarProductos();
  }, [categoriaFiltro]);

  const productosFiltrados = busqueda
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  const abrirFormNuevo = () => {
    setEditando(null);
    setForm({ nombre: "", precio: 0, peso: undefined, unidad: "kg", qr_code: "", categoria: "" });
    setMostrarForm(true);
  };

  const abrirFormEditar = (p: Producto) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      precio: p.precio,
      peso: p.peso ?? undefined,
      unidad: p.unidad,
      qr_code: p.qr_code ?? "",
      categoria: p.categoria ?? "",
    });
    setMostrarForm(true);
  };

  const guardar = async () => {
    setError("");
    try {
      if (editando) {
        await productosApi.actualizar(editando.id, form);
      } else {
        await productosApi.crear(form);
      }
      setMostrarForm(false);
      cargarProductos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const desactivar = async (id: string) => {
    await productosApi.eliminar(id);
    cargarProductos();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button
          onClick={abrirFormNuevo}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Agregar producto
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Precio USD</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Peso</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Categoría</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">QR</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className="px-4 py-3 text-right text-green-600">${p.precio.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {p.peso ? `${p.peso} ${p.unidad}` : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.categoria && (
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">{p.categoria}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-400 font-mono">
                  {p.qr_code || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => abrirFormEditar(p)}
                    className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => desactivar(p.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productosFiltrados.length === 0 && (
          <p className="text-center text-gray-400 py-8">No hay productos</p>
        )}
      </div>

      {/* Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">
              {editando ? "Editar producto" : "Nuevo producto"}
            </h2>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Precio USD"
                  value={form.precio || ""}
                  onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Peso"
                  value={form.peso || ""}
                  onChange={(e) => setForm({ ...form, peso: parseFloat(e.target.value) || undefined })}
                  className="w-24 px-3 py-2 border rounded-lg"
                  step="0.1"
                />
                <select
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                  className="w-20 px-2 py-2 border rounded-lg"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Código QR"
                value={form.qr_code || ""}
                onChange={(e) => setForm({ ...form, qr_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <select
                value={form.categoria || ""}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editando ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
