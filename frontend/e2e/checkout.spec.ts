import { test, expect } from "@playwright/test";

test.describe("Checkout", () => {
  test.beforeEach(async ({ page }) => {
    // Seed a test BCV rate
    await fetch("http://localhost:8000/tasa-bcv/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasa: 36.5 }),
    });

    // Seed test products
    await fetch("http://localhost:8000/productos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Arroz Test", precio: 1.2, qr_code: "E2E_ARROZ" }),
    });
    await fetch("http://localhost:8000/productos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Leche Test", precio: 1.8, qr_code: "E2E_LECHE" }),
    });

    await page.goto("/");
  });

  test("shows checkout page with search and empty cart", async ({ page }) => {
    await expect(page.getByPlaceholder("Buscar producto")).toBeVisible();
    await expect(page.getByText("Escanea un QR o busca un producto")).toBeVisible();
    await expect(page.getByText("Cobrar")).toBeDisabled();
  });

  test("search and add product to cart", async ({ page }) => {
    await page.getByPlaceholder("Buscar producto").fill("Arroz");
    await page.waitForTimeout(500);
    await page.getByText("Arroz Test").click();

    await expect(page.getByText("Arroz Test")).toBeVisible();
    await expect(page.getByText("$1.20")).toBeVisible();
  });

  test("complete sale with efectivo", async ({ page }) => {
    // Search and add
    await page.getByPlaceholder("Buscar producto").fill("Arroz");
    await page.waitForTimeout(500);
    await page.getByText("Arroz Test").click();

    // Select payment method (efectivo is default)
    await expect(page.getByLabel("Efectivo")).toBeChecked();

    // Click cobrar
    await page.getByText("Cobrar").click();
    await expect(page.getByText("Venta registrada exitosamente")).toBeVisible();
  });

  test("complete sale with pago movil", async ({ page }) => {
    await page.getByPlaceholder("Buscar producto").fill("Leche");
    await page.waitForTimeout(500);
    await page.getByText("Leche Test").click();

    await page.getByLabel("Pago Móvil").click();
    await page.getByText("Cobrar").click();
    await expect(page.getByText("Venta registrada exitosamente")).toBeVisible();
  });

  test("shows BCV rate in sidebar", async ({ page }) => {
    await expect(page.getByText("BCV:")).toBeVisible();
    await expect(page.getByText("36.50")).toBeVisible();
  });
});
