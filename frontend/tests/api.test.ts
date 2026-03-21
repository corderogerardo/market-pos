import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking fetch
const { productosApi, ventasApi, tasaBcvApi } = await import("../src/services/api");

beforeEach(() => {
  mockFetch.mockReset();
});

describe("productosApi", () => {
  it("listar fetches products", async () => {
    const productos = [{ id: "1", nombre: "Arroz", precio: 1.2 }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(productos),
    });

    const result = await productosApi.listar();
    expect(result).toEqual(productos);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/productos/",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } })
    );
  });

  it("buscar sends query parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await productosApi.buscar("arroz");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/productos/buscar?q=arroz",
      expect.any(Object)
    );
  });

  it("buscarPorQR sends QR code", async () => {
    const producto = { id: "1", nombre: "Arroz", qr_code: "ARR01" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(producto),
    });

    const result = await productosApi.buscarPorQR("ARR01");
    expect(result).toEqual(producto);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/productos/qr/ARR01",
      expect.any(Object)
    );
  });

  it("crear sends POST with product data", async () => {
    const newProduct = { nombre: "Leche", precio: 1.8 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "2", ...newProduct }),
    });

    await productosApi.crear(newProduct);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/productos/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(newProduct),
      })
    );
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: "Error de prueba" }),
    });

    await expect(productosApi.crear({ nombre: "", precio: 0 })).rejects.toThrow("Error de prueba");
  });
});

describe("ventasApi", () => {
  it("crear sends sale data with payment method", async () => {
    const ventaData = {
      items: [{ producto_id: "1", cantidad: 2 }],
      metodo_pago: "efectivo" as const,
      tasa_bcv: 36.5,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "v1", ...ventaData }),
    });

    await ventasApi.crear(ventaData);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/ventas/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(ventaData),
      })
    );
  });

  it("listar with filters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await ventasApi.listar({ metodo_pago: "pago_movil" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("metodo_pago=pago_movil"),
      expect.any(Object)
    );
  });
});

describe("tasaBcvApi", () => {
  it("manual sends POST with rate", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "t1", tasa: 36.5 }),
    });

    await tasaBcvApi.manual(36.5);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/tasa-bcv/manual",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tasa: 36.5 }),
      })
    );
  });
});
