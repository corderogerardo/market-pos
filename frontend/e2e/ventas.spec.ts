import { test, expect } from "@playwright/test";

test.describe("Ventas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ventas");
  });

  test("shows ventas page with filters", async ({ page }) => {
    await expect(page.getByText("Historial de Ventas")).toBeVisible();
    await expect(page.getByText("Desde")).toBeVisible();
    await expect(page.getByText("Hasta")).toBeVisible();
    await expect(page.getByText("Método de pago")).toBeVisible();
  });

  test("shows daily summary cards", async ({ page }) => {
    await expect(page.getByText("Total ventas")).toBeVisible();
    await expect(page.getByText("Total USD")).toBeVisible();
    await expect(page.getByText("Total Bs")).toBeVisible();
  });
});
