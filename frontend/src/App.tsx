import { Routes, Route, NavLink } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Checkout from "./pages/Checkout";
import Productos from "./pages/Productos";
import Ventas from "./pages/Ventas";
import Deudas from "./pages/Deudas";
import Configuracion from "./pages/Configuracion";
import Activacion from "./pages/Activacion";
import { tasaBcvApi, licenciaApi, waitForBackend } from "./services/api";
import type { TasaBCV, LicenciaEstado } from "./types/models";

function Cargando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">Market POS</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">{texto}</p>
      </div>
    </div>
  );
}

function App() {
  const [tasaBcv, setTasaBcv] = useState<TasaBCV | null>(null);
  const [backendReady, setBackendReady] = useState(false);
  const [licencia, setLicencia] = useState<LicenciaEstado | null>(null);
  const [licVerificada, setLicVerificada] = useState(false);

  const cargarTasa = useCallback(() => {
    tasaBcvApi.actual().then(setTasaBcv).catch(() => {});
  }, []);

  useEffect(() => {
    waitForBackend()
      .then(() => {
        setBackendReady(true);
        return licenciaApi.estado();
      })
      .then((e) => {
        setLicencia(e);
        setLicVerificada(true);
        if (e.activa) cargarTasa();
      })
      .catch(() => {
        setBackendReady(true);
        setLicencia({
          activa: false,
          motivo: "No se pudo verificar la licencia",
          machine_id: "—",
          info: null,
        });
        setLicVerificada(true);
      });
  }, [cargarTasa]);

  const navItems = [
    { to: "/", label: "Venta", icon: "🛒" },
    { to: "/productos", label: "Productos", icon: "📦" },
    { to: "/ventas", label: "Ventas", icon: "📊" },
    { to: "/deudas", label: "Deudas", icon: "📒" },
    { to: "/configuracion", label: "Configuración", icon: "⚙️" },
  ];

  if (!backendReady) return <Cargando texto="Iniciando sistema..." />;
  if (!licVerificada) return <Cargando texto="Verificando licencia..." />;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Market POS</h1>
          {tasaBcv && (
            <p className="text-xs text-gray-500 mt-1">
              BCV: {tasaBcv.tasa.toFixed(2)} Bs/$
            </p>
          )}
        </div>
        <div className="flex-1 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Checkout tasaBcv={tasaBcv} onTasaUpdate={setTasaBcv} />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/deudas" element={<Deudas />} />
          <Route path="/configuracion" element={<Configuracion tasaBcv={tasaBcv} onTasaUpdate={setTasaBcv} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
