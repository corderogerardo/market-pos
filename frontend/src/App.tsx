import { Routes, Route, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import Checkout from "./pages/Checkout";
import Productos from "./pages/Productos";
import Ventas from "./pages/Ventas";
import Configuracion from "./pages/Configuracion";
import { tasaBcvApi } from "./services/api";
import type { TasaBCV } from "./types/models";

function App() {
  const [tasaBcv, setTasaBcv] = useState<TasaBCV | null>(null);

  useEffect(() => {
    tasaBcvApi.actual().then(setTasaBcv).catch(() => {});
  }, []);

  const navItems = [
    { to: "/", label: "Checkout", icon: "🛒" },
    { to: "/productos", label: "Productos", icon: "📦" },
    { to: "/ventas", label: "Ventas", icon: "📊" },
    { to: "/configuracion", label: "Configuración", icon: "⚙️" },
  ];

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
          <Route path="/configuracion" element={<Configuracion tasaBcv={tasaBcv} onTasaUpdate={setTasaBcv} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
