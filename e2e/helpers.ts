import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export const PNG_FIXTURE = "e2e/fixtures/product.png";

export async function enterDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue in local demo" }).click();
  await page.waitForURL(/\/(onboarding|dashboard)/);
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Skip for now" }).click();
    await page.waitForURL(/\/dashboard/);
  }
}

export function pngSize(path: string) {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export async function createProduct(page: Page, name: string, withImage = true) {
  await page.goto("/products/new");
  await page.getByLabel("Etsy listing or destination URL").fill("https://www.etsy.com/listing/987654321/test-product");
  await expect(page.getByText(/doesn't import listing details automatically/)).toBeVisible();
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Short description").fill("A printable planner used in end-to-end tests.");
  await page.getByLabel("Target audience").fill("Busy parents");
  await page.getByLabel("Main benefit").fill("Plan the whole week in ten minutes");
  await page.getByLabel("Keywords").fill("weekly planner, family planner");
  if (withImage) await page.locator("#images").setInputFiles(PNG_FIXTURE);
  await page.getByRole("button", { name: "Add product" }).click();
  await page.waitForURL(/\/products\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

export async function generateCampaign(page: Page, productId: string) {
  await page.goto(`/campaigns/new?product=${productId}`);
  await page.getByRole("button", { name: /Generate marketing angles/ }).click();
  await page.waitForURL(/\/campaigns\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByText("Review the marketing angles")).toBeVisible();
  await page.getByRole("button", { name: /Generate pins/ }).click();
  await expect(page.getByRole("heading", { name: "Review and edit pins" })).toBeVisible({ timeout: 60_000 });
  return page.url().split("/").pop()!;
}
