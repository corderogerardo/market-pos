import { useState, useEffect } from "react";
import { tasaBcvApi, syncApi } from "../services/api";
import type { TasaBCV } from "../types/models";

interface Props {
  tasaBcv: TasaBCV | null;
  onTasaUpdate: (t: TasaBCV) => void;
}

export default function Configuracion({ tasaBcv, onTasaUpdate }: Props) {
  const [tasaManual, setTasaManual] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{configurado: boolean; credentials_path: string} | null>(null);
  const [driveError, setDriveError] = useState(false);

  const fetchDriveStatus = () => {
    setDriveError(false);
    fetch("http://localhost:8000/sync/google-drive/status")
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(setDriveStatus)
      .catch(() => {
        setDriveError(true);
        // Retry after 3 seconds if backend isn't ready yet
        setTimeout(() => {
          fetch("http://localhost:8000/sync/google-drive/status")
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data) => { setDriveStatus(data); setDriveError(false); })
            .catch(() => setDriveError(true));
        }, 3000);
      });
  };

  useEffect(() => {
    fetchDriveStatus();
  }, []);

  const mostrarMensaje = (msg: string) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(""), 3000);
  };

  const actualizarDesdeWeb = async () => {
    setCargando(true);
    setError("");
    try {
      const tasa = await tasaBcvApi.actualizar();
      onTasaUpdate(tasa);
      mostrarMensaje("Tasa BCV actualizada desde la web");
    } catch {
      setError("No se pudo obtener la tasa del BCV. Ingrese manualmente.");
    } finally {
      setCargando(false);
    }
  };

  const guardarTasaManual = async () => {
    const valor = parseFloat(tasaManual);
    if (isNaN(valor) || valor <= 0) {
      setError("Ingrese un valor válido");
      return;
    }
    try {
      const tasa = await tasaBcvApi.manual(valor);
      onTasaUpdate(tasa);
      setTasaManual("");
      mostrarMensaje("Tasa manual registrada");
    } catch {
      setError("Error al guardar la tasa");
    }
  };

  const hacerBackup = async () => {
    setCargando(true);
    try {
      const result = await syncApi.backup();
      mostrarMensaje(
        result.estado === "completado"
          ? "Respaldo creado exitosamente"
          : "Error en el respaldo: " + result.detalles
      );
    } catch {
      setError("Error al crear respaldo");
    } finally {
      setCargando(false);
    }
  };

  const restaurar = async () => {
    setCargando(true);
    try {
      const result = await syncApi.restore();
      mostrarMensaje(
        result.estado === "completado"
          ? "Datos restaurados exitosamente"
          : "Error: " + result.detalles
      );
    } catch {
      setError("Error al restaurar");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {mensaje && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
          {mensaje}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
          <button onClick={() => setError("")} className="ml-2">✕</button>
        </div>
      )}

      {/* BCV Rate */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tasa BCV</h2>
        {tasaBcv ? (
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="text-3xl font-bold text-blue-600">{tasaBcv.tasa.toFixed(2)} Bs/$</p>
              <p className="text-sm text-gray-500">
                Fecha: {tasaBcv.fecha} | Actualizado:{" "}
                {new Date(tasaBcv.consultado_en).toLocaleString("es-VE")}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mb-4">No hay tasa registrada</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={actualizarDesdeWeb}
            disabled={cargando}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {cargando ? "Consultando..." : "Actualizar desde BCV"}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600 mb-2">Ingreso manual (si no hay conexión)</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Ej: 36.50"
              value={tasaManual}
              onChange={(e) => setTasaManual(e.target.value)}
              className="px-3 py-2 border rounded-lg w-40"
              step="0.01"
            />
            <button
              onClick={guardarTasaManual}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Guardar tasa manual
            </button>
          </div>
        </div>
      </section>

      {/* Backup */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Respaldo de datos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Los datos se guardan localmente y se suben a Google Drive si está configurado.
        </p>
        <div className="flex gap-3">
          <button
            onClick={hacerBackup}
            disabled={cargando}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
          >
            {cargando ? "Respaldando..." : "Crear respaldo"}
          </button>
          <button
            onClick={restaurar}
            disabled={cargando}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
          >
            Restaurar último respaldo
          </button>
        </div>

        {/* Google Drive status */}
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Google Drive</h3>
          {driveStatus ? (
            driveStatus.configurado ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Conectado — los respaldos se suben automáticamente
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  No configurado. Para activar:
                </p>
                <ol className="text-xs text-gray-500 list-decimal ml-4 space-y-1">
                  <li>Ve a <span className="font-mono">console.cloud.google.com/apis/credentials</span></li>
                  <li>Crea un OAuth Client ID (tipo "Desktop app")</li>
                  <li>Descarga el JSON y guárdalo como:</li>
                </ol>
                <code className="block mt-2 text-xs bg-gray-100 p-2 rounded break-all">
                  {driveStatus.credentials_path}
                </code>
                <button
                  onClick={async () => {
                    try {
                      const r = await fetch("http://localhost:8000/sync/google-drive/auth", { method: "POST" });
                      const data = await r.json();
                      if (data.estado === "autenticado") {
                        mostrarMensaje("Google Drive conectado exitosamente");
                        setDriveStatus({ ...driveStatus, configurado: true });
                      } else {
                        setError(data.mensaje);
                      }
                    } catch {
                      setError("Error al conectar con Google Drive");
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Conectar Google Drive
                </button>
              </div>
            )
          ) : driveError ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-red-500">No se pudo verificar el estado.</p>
              <button
                onClick={fetchDriveStatus}
                className="text-xs text-blue-600 hover:underline"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Verificando conexión con el servidor...</p>
          )}
        </div>
      </section>

      {/* Store info */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Datos de la tienda</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre de la tienda</label>
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Mi Tienda" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dirección</label>
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Calle X, Ciudad" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">RIF</label>
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="J-00000000-0" />
          </div>
        </div>
      </section>
    </div>
  );
}
