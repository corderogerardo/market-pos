import { useState } from "react";
import { licenciaApi } from "../services/api";
import type { LicenciaEstado } from "../types/models";

interface Props {
  estado: LicenciaEstado;
  onActivado: (e: LicenciaEstado) => void;
}

export default function Activacion({ estado, onActivado }: Props) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const copiarId = async () => {
    try {
      await navigator.clipboard.writeText(estado.machine_id);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* algunos webviews no permiten clipboard; el ID igual es visible */
    }
  };

  const activar = async () => {
    if (!clave.trim()) {
      setError("Pega la clave de licencia");
      return;
    }
    setProcesando(true);
    setError("");
    try {
      const e = await licenciaApi.activar(clave.trim());
      onActivado(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar la licencia");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">Market POS</h1>
        <p className="text-gray-500 mb-6">Activación de licencia</p>

        {estado.motivo && estado.motivo !== "No hay licencia" && (
          <div className="mb-4 p-3 bg-amber-100 text-amber-800 rounded-lg text-sm">
            {estado.motivo}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-sm text-gray-600 mb-1">
            ID de este equipo
          </label>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono break-all">
              {estado.machine_id}
            </code>
            <button
              onClick={copiarId}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 whitespace-nowrap"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Envía este ID al proveedor para recibir tu clave de licencia.
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-sm text-gray-600 mb-1">
            Clave de licencia
          </label>
          <textarea
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Pega aquí la clave que te enviaron..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <button
          onClick={activar}
          disabled={procesando}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {procesando ? "Activando..." : "Activar"}
        </button>
      </div>
    </div>
  );
}
