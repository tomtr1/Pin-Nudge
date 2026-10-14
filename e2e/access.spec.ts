import { expect, test } from "@playwright/test";

test("signed-out visitors are redirected and APIs refuse access", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  const id = "6f1c2b8e-4d1a-4c33-9a57-2f1d6c0e9b11";
  expect((await request.get(`/api/pins/${id}/image`)).status()).toBe(401);
  expect((await request.get(`/api/campaigns/${id}/export?format=csv`)).status()).toBe(401);
  expect((await request.get("/api/account/export")).status()).toBe(401);
  expect((await request.post("/api/webhooks/stripe", { data: "{}" })).status()).toBe(503);
});

test("public pages render with security headers and no inert primary links", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.headers()["x-frame-options"]).toBe("DENY");
  expect(res?.headers()["x-content-type-options"]).toBe("nosniff");
  for (const path of ["/pricing", "/help", "/privacy", "/terms", "/login", "/signup"]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
  }
  await expect(page.locator("a[href='#'], a:not([href])")).toHaveCount(0);
});

test("mobile layout has no horizontal overflow and the app menu works", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue in local demo" }).click();
  await page.waitForURL(/\/(onboarding|dashboard)/);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog", { name: "Navigation" }).getByRole("link", { name: "Products" }).click();
  await expect(page).toHaveURL(/\/products/);
  await ctx.close();
});
