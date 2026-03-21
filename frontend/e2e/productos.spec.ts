import { test, expect } from "@playwright/test";

test.describe("Productos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/productos");
  });

  test("shows product list page", async ({ page }) => {
    await expect(page.getByText("Productos")).toBeVisible();
    await expect(page.getByText("+ Agregar producto")).toBeVisible();
  });

  test("create a new product", async ({ page }) => {
    await page.getByText("+ Agregar producto").click();

    await expect(page.getByText("Nuevo producto")).toBeVisible();
    await page.getByPlaceholder("Nombre").fill("Producto E2E");
    await page.getByPlaceholder("Precio USD").fill("2.50");
    await page.getByPlaceholder("Código QR").fill("E2E_QR_" + Date.now());

    await page.getByText("Crear producto").click();
    await expect(page.getByText("Producto E2E")).toBeVisible();
  });
});
