import { describe, it, expect } from "vitest";
import type { CartItem, Producto } from "../src/types/models";

// Cart logic helper (same as in Checkout component)
function agregarAlCarrito(carrito: CartItem[], producto: Producto): CartItem[] {
  const existente = carrito.find((i) => i.producto.id === producto.id);
  if (existente) {
    return carrito.map((i) =>
      i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
    );
  }
  return [...carrito, { producto, cantidad: 1 }];
}

function calcularTotal(carrito: CartItem[]): number {
  return carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
}

function calcularTotalBs(carrito: CartItem[], tasaBcv: number): number {
  return calcularTotal(carrito) * tasaBcv;
}

const producto1: Producto = {
  id: "1",
  nombre: "Arroz 1kg",
  precio: 1.2,
  peso: 1.0,
  unidad: "kg",
  qr_code: "ARR01",
  categoria: "granos",
  activo: true,
  creado_en: "",
  actualizado_en: "",
};

const producto2: Producto = {
  id: "2",
  nombre: "Leche 1L",
  precio: 1.8,
  peso: 1.0,
  unidad: "kg",
  qr_code: "LECHE01",
  categoria: "lácteos",
  activo: true,
  creado_en: "",
  actualizado_en: "",
};

describe("Cart logic", () => {
  it("adds product to empty cart", () => {
    const cart = agregarAlCarrito([], producto1);
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(1);
    expect(cart[0].producto.nombre).toBe("Arroz 1kg");
  });

  it("increments quantity for existing product", () => {
    let cart = agregarAlCarrito([], producto1);
    cart = agregarAlCarrito(cart, producto1);
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(2);
  });

  it("adds different products separately", () => {
    let cart = agregarAlCarrito([], producto1);
    cart = agregarAlCarrito(cart, producto2);
    expect(cart).toHaveLength(2);
  });

  it("calculates total USD correctly", () => {
    let cart = agregarAlCarrito([], producto1);
    cart = agregarAlCarrito(cart, producto1); // 2 x 1.20 = 2.40
    cart = agregarAlCarrito(cart, producto2); // 1 x 1.80 = 1.80
    expect(calcularTotal(cart)).toBeCloseTo(4.2);
  });

  it("calculates total Bs with BCV rate", () => {
    const cart = agregarAlCarrito([], producto1); // 1.20 USD
    const totalBs = calcularTotalBs(cart, 36.5);
    expect(totalBs).toBeCloseTo(43.8);
  });

  it("returns 0 for empty cart", () => {
    expect(calcularTotal([])).toBe(0);
    expect(calcularTotalBs([], 36.5)).toBe(0);
  });
});
