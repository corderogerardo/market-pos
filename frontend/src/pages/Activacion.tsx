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
            Clave de licencia
          </label>
          <input
            type="text"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") activar();
            }}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-wider focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Ingresa la clave de activación que te entregó el proveedor.
          </p>
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
