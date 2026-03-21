# PRD — Market Desktop App (MVP)

## Resumen

Aplicación de escritorio para punto de venta (POS) de una tienda de alimentos. Permite escanear códigos QR o buscar productos en una lista para agregarlos al checkout. Los precios se manejan en USD y se convierten a bolívares usando la tasa del BCV (Banco Central de Venezuela). La base de datos opera localmente y se sincroniza a la nube al cerrar la aplicación.

---

## Problema

Las tiendas de alimentos en Venezuela necesitan un sistema de punto de venta sencillo que:

- Funcione offline durante el día sin depender de internet constante
- Maneje precios en USD con conversión automática a bolívares según la tasa oficial del BCV
- Permita agregar productos rápidamente mediante escaneo de QR o búsqueda manual
- Respalde la información diaria en la nube para evitar pérdida de datos

---

## Usuarios objetivo

- **Cajero(a)**: Persona que opera la caja y registra las ventas diarias
- **Administrador(a) de tienda**: Persona que gestiona el inventario y revisa reportes de ventas

---

## Funcionalidades del MVP

### 1. Catálogo de productos

Cada producto contiene:

| Campo       | Tipo     | Descripción                                |
|-------------|----------|--------------------------------------------|
| `id`        | string   | Identificador único (UUID)                 |
| `nombre`    | string   | Nombre o título del producto               |
| `precio`    | number   | Precio en USD                              |
| `peso`      | number   | Peso del producto (en kg o g)              |
| `unidad`    | string   | Unidad de peso (`kg`, `g`, `lb`)           |
| `qr_code`   | string   | Código QR asociado al producto             |
| `categoria` | string   | Categoría del producto (ej: frutas, carnes)|
| `activo`    | boolean  | Si el producto está disponible para venta  |

**Acciones:**

- Crear, editar y desactivar productos
- Buscar productos por nombre, categoría o código QR
- Generar e imprimir códigos QR para productos nuevos

### 2. Punto de venta (Checkout)

- Escanear código QR con cámara del laptop o lector USB para agregar producto al carrito
- Buscar producto manualmente por nombre en una barra de búsqueda
- Ajustar cantidad de cada producto en el carrito
- Eliminar productos del carrito
- Mostrar subtotal, impuestos (si aplica) y total en USD
- Mostrar total equivalente en bolívares (Bs) según tasa BCV del día
- **Seleccionar método de pago antes de finalizar: Efectivo, Pago Móvil, Punto de Venta**
- Registrar venta y generar recibo

### 3. Tasa BCV

- Consultar automáticamente la tasa USD/Bs del BCV al abrir la aplicación
- Permitir actualización manual de la tasa si no hay conexión
- Mostrar la tasa vigente en la interfaz
- Almacenar historial de tasas consultadas
- **Fuente**: API del BCV o scraping de la página oficial del BCV

### 4. Base de datos local con sincronización

- **Local**: Base de datos SQLite almacenada en el laptop
- **Sincronización**: Al cerrar la aplicación, se sube un respaldo a la nube
- **Nube**: Almacenamiento en la nube (por definir: S3, Google Drive, o similar)
- **Restauración**: Al abrir la app en un nuevo dispositivo, se puede descargar el último respaldo
- **Datos sincronizados**: productos, ventas, tasa BCV, configuración

### 5. Historial de ventas

- Lista de todas las ventas del día con fecha, hora y monto
- Detalle de cada venta (productos, cantidades, precios)
- Resumen diario: total de ventas en USD y Bs
- Filtrar ventas por rango de fechas
- **Registrar y mostrar método de pago por venta: Efectivo, Pago Móvil, Punto de Venta**
- **Resumen diario desglosado por método de pago**

---

## Arquitectura técnica

### Stack

| Capa              | Tecnología                                      |
|-------------------|--------------------------------------------------|
| Frontend          | TypeScript + React + Tailwind CSS (Electron/Tauri)|
| Backend / API     | Python (FastAPI)                                 |
| Base de datos     | SQLite (local)                                   |
| Sincronización    | Python script al cierre de la app                |
| Tasa BCV          | Python (requests/httpx) — scraping o API         |
| Empaquetado       | Electron o Tauri                                 |

### Diagrama de flujo simplificado

```
[Inicio App]
     │
     ├── Consultar tasa BCV → Guardar en SQLite
     │
     ├── [Pantalla principal: Checkout]
     │       │
     │       ├── Escanear QR → Buscar producto → Agregar al carrito
     │       ├── Buscar manual → Seleccionar producto → Agregar al carrito
     │       │
     │       └── Finalizar venta → Guardar en SQLite → Generar recibo
     │
     └── [Cerrar App]
             │
             └── Sincronizar SQLite → Subir respaldo a la nube
```

### Modelo de datos (SQLite)

```sql
CREATE TABLE productos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    peso REAL,
    unidad TEXT DEFAULT 'kg',
    qr_code TEXT UNIQUE,
    categoria TEXT,
    activo INTEGER DEFAULT 1,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ventas (
    id TEXT PRIMARY KEY,
    fecha TEXT DEFAULT (datetime('now')),
    total_usd REAL NOT NULL,
    tasa_bcv REAL NOT NULL,
    total_bs REAL NOT NULL,
    metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('efectivo', 'pago_movil', 'punto_de_venta'))
);

CREATE TABLE venta_items (
    id TEXT PRIMARY KEY,
    venta_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE tasa_bcv (
    id TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    tasa REAL NOT NULL,
    consultado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sincronizaciones (
    id TEXT PRIMARY KEY,
    fecha TEXT DEFAULT (datetime('now')),
    estado TEXT NOT NULL,
    detalles TEXT
);
```

---

## Interfaz de usuario (pantallas MVP)

### 1. Pantalla de Checkout (principal)
- Barra de búsqueda de productos (parte superior)
- Botón para activar cámara/escáner QR
- Lista del carrito (productos agregados, cantidad, precio)
- Panel lateral: subtotal, tasa BCV, total USD, total Bs
- Botón "Cobrar" para finalizar la venta

### 2. Pantalla de Productos
- Tabla/lista de todos los productos
- Botón "Agregar producto"
- Editar / desactivar producto existente
- Campo de búsqueda y filtros por categoría

### 3. Pantalla de Ventas
- Lista de ventas del día
- Filtro por fecha
- Resumen de totales (USD / Bs)
- Detalle expandible de cada venta
- **Mostrar método de pago de cada venta (Efectivo, Pago Móvil, Punto de Venta)**
- **Filtrar ventas por método de pago**

### 4. Configuración
- Tasa BCV actual (con botón de actualizar)
- Configuración de respaldo en la nube
- Datos de la tienda (nombre, dirección, RIF)

---

## Idioma

Toda la interfaz, mensajes, y datos de ejemplo estarán en **español (Venezuela)**.

---

## Decisiones pendientes

| # | Decisión                                          | Opciones                              |
|---|---------------------------------------------------|---------------------------------------|
| 1 | Framework de escritorio                           | Electron vs Tauri                     |
| 2 | Servicio de nube para respaldos                   | AWS S3, Google Drive, Dropbox API     |
| 3 | Método de consulta de tasa BCV                    | API oficial, scraping, API de terceros|
| 4 | Manejo de impuestos                               | IVA incluido en precio o sumado aparte|
| 5 | Formato de recibo                                 | Impresión térmica, PDF, o ambos       |

---

## Criterios de éxito (MVP)

- [ ] Agregar productos por QR y búsqueda manual
- [ ] Registrar ventas con precio en USD y equivalente en Bs
- [ ] Consultar tasa BCV automáticamente
- [ ] Base de datos local funcional (SQLite)
- [ ] Sincronización de respaldo al cerrar la app
- [ ] Interfaz en español (Venezuela)

---

## Fuera del alcance (MVP)

- Gestión de empleados y permisos
- Sistema de inventario avanzado (stock mínimo, alertas)
- Reportes financieros detallados
- Integración con impresoras fiscales
- Pagos electrónicos avanzados (Zelle, transferencias bancarias)
- Multi-tienda
