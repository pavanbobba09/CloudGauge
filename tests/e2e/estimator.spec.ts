import { expect, test } from "@playwright/test";

test("calculates a single-cloud estimate", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Build your estimate" })).toBeVisible();
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByRole("heading", { name: "Estimated monthly cost" })).toBeVisible();
  await expect(page.getByText("Cost breakdown")).toBeVisible();
});

test("compares three independently configured clouds", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Azure/ }).click();
  await page.getByRole("button", { name: /GCP/ }).click();
  await page.getByRole("button", { name: "Calculate estimate" }).click();
  await expect(page.getByText("Lowest")).toBeVisible();
  await expect(page.getByText(/may not be technically equivalent/)).toBeVisible();
});

test("searches the broader service catalog and adds a generic meter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/services available/)).toBeVisible();
  await page.getByLabel("Service").selectOption("AWSLambda");
  await page.getByRole("button", { name: "Search catalog" }).click();
  await expect(page.locator(".explorerResults article").first()).toBeVisible();
  await page.locator(".explorerResults article").first().getByRole("button", { name: "+ Add" }).click();
  await expect(page.getByText("2 configured services")).toBeVisible();
});
