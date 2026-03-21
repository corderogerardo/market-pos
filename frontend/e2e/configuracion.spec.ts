import { test, expect } from "@playwright/test";

test.describe("Configuración", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/configuracion");
  });

  test("shows settings page", async ({ page }) => {
    await expect(page.getByText("Configuración")).toBeVisible();
    await expect(page.getByText("Tasa BCV")).toBeVisible();
    await expect(page.getByText("Respaldo de datos")).toBeVisible();
    await expect(page.getByText("Datos de la tienda")).toBeVisible();
  });

  test("enter manual BCV rate", async ({ page }) => {
    await page.getByPlaceholder("Ej: 36.50").fill("40.00");
    await page.getByText("Guardar tasa manual").click();
    await expect(page.getByText("Tasa manual registrada")).toBeVisible();
  });

  test("create backup", async ({ page }) => {
    await page.getByText("Crear respaldo").click();
    await expect(page.getByText("Respaldo creado exitosamente")).toBeVisible();
  });
});
