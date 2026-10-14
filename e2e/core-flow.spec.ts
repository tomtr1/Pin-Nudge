import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createProduct, enterDemo, generateCampaign, pngSize } from "./helpers";

test.describe.configure({ mode: "serial" });

test("first-time user: landing → demo → product → campaign → edit → export → saved", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn your Etsy products into Pinterest marketing campaigns." })).toBeVisible();
  await expect(page.locator("footer").getByText("not affiliated with, endorsed by, or sponsored by Pinterest or Etsy")).toBeVisible();
  await page.getByRole("link", { name: /Create your first campaign/ }).first().click();
  await expect(page).toHaveURL(/\/signup/);

  // Onboarding with a store name
  await page.getByRole("button", { name: "Continue in local demo" }).click();
  await page.waitForURL(/\/onboarding/);
  await page.getByLabel("Store name").fill("E2E Paper Co.");
  await page.getByLabel("Etsy shop URL").fill("not-a-url");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(/doesn't look like a valid link|Enter a public web address/)).toBeVisible();
  await page.getByLabel("Etsy shop URL").fill("https://www.etsy.com/shop/E2EPaper");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText("Start with a product")).toBeVisible();

  // Product with an uploaded image
  const productId = await createProduct(page, "E2E Weekly Planner");
  await expect(page.locator(`img[src*="/api/products/${productId}/images/0"]`)).toBeVisible();

  // Campaign generation (demo content, clearly labelled)
  const campaignId = await generateCampaign(page, productId);
  await expect(page.getByText("Sample content (demo mode)")).toBeVisible();
  const cards = page.locator("ul li").filter({ has: page.getByRole("button", { name: /Edit pin:/ }) });
  await expect(cards).toHaveCount(6);

  // Edit a pin; preview comes from the server renderer
  await page.getByRole("button", { name: /Edit pin:/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: /./ }).first()).toBeVisible();
  await dialog.getByLabel("Title").fill("Plan your family week in ten minutes");
  await dialog.getByRole("tab", { name: "Image text" }).click();
  await dialog.getByLabel("Headline").fill("Your calm family week");
  await dialog.getByRole("button", { name: "Save pin" }).click();
  await expect(page.getByText("Pin saved")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Plan your family week in ten minutes")).toBeVisible();

  // Regenerate copy keeps the hand-edited title
  const editedCard = page.locator("li").filter({ hasText: "Plan your family week in ten minutes" });
  await editedCard.getByRole("button", { name: "More pin actions" }).click();
  await page.getByRole("menuitem", { name: "Regenerate copy" }).click();
  await expect(page.getByText(/Kept your edits to: title/)).toBeVisible();
  await expect(page.getByText("Plan your family week in ten minutes")).toBeVisible();

  // Approve everything, download a PNG and the CSV
  await page.getByRole("button", { name: /Approve all drafts/ }).click();
  await expect(page.getByText(/6 pins approved/)).toBeVisible();
  await page.locator("li").filter({ hasText: "Plan your family week in ten minutes" }).getByRole("button", { name: "More pin actions" }).click();
  const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Download PNG" }).click()]);
  expect(png.suggestedFilename()).toMatch(/^e2e-weekly-planner_.+_\d{2}\.png$/);
  const pngPath = await png.path();
  expect(pngSize(pngPath!)).toEqual({ width: 1000, height: 1500 });

  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /CSV of approved pins/ }).click()]);
  const csvText = readFileSync((await csv.path())!, "utf8");
  expect(csvText).toContain("filename,title,description,destination_url");
  expect(csvText).toContain("Plan your family week in ten minutes");
  expect(csvText).toContain("https://www.etsy.com/listing/987654321/test-product");
  expect(csvText).toContain("sample (demo mode, not AI-generated)");

  const [summary] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Campaign summary/ }).click()]);
  expect(readFileSync((await summary.path())!, "utf8")).toContain("Sample content");

  // ZIP export is a Growth feature: the server enforces it too
  await expect(page.getByText(/Batch ZIP export is on Growth and Pro/)).toBeVisible();
  const zip = await page.request.get(`/api/campaigns/${campaignId}/export?format=zip`);
  expect(zip.status()).toBe(402);

  // Persistence: reload, then find it from the dashboard
  await page.reload();
  await expect(page.getByText("Plan your family week in ten minutes")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /E2E Weekly Planner/ }).first()).toBeVisible();
  await expect(page.getByText("Pins created")).toBeVisible();
});

test("returning user: sign out, sign back in, edits persist", async ({ page }) => {
  await enterDemo(page);
  await page.getByRole("button", { name: "Account menu" }).first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/campaigns");
  await expect(page).toHaveURL(/\/login\?next=%2Fcampaigns/);
  await enterDemo(page);
  await page.goto("/campaigns");
  await page.getByRole("link", { name: /E2E Weekly Planner/ }).first().click();
  await expect(page.getByText("Plan your family week in ten minutes")).toBeVisible();
});

test("usage limits: the Free plan stops at 2 campaign generations per month", async ({ page }) => {
  await enterDemo(page);
  const productId = await createProduct(page, "E2E Limit Product", false);
  await generateCampaign(page, productId); // second generation this month
  await page.goto(`/campaigns/new?product=${productId}`);
  await expect(page.getByText("Monthly campaign limit reached")).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate marketing angles/ })).toBeDisabled();
  await page.goto("/dashboard");
  await expect(page.getByText("2 / 2")).toBeVisible();
});

test("plan-gated features explain the upgrade path; billing is honestly disabled", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/calendar");
  await expect(page.getByText("The content calendar is part of Growth and Pro")).toBeVisible();
  await page.goto("/analytics");
  await expect(page.getByText("Performance tracking is part of Growth and Pro")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText("Live billing isn't connected on this server")).toBeVisible();
  await expect(page.getByRole("button", { name: /Upgrade to Growth/ })).toBeDisabled();
  await expect(page.getByText("Not connected").first()).toBeVisible();
});

test("account data export downloads the user's records", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/settings#privacy");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Export my data/ }).click()]);
  const json = JSON.parse(readFileSync((await dl.path())!, "utf8"));
  expect(json.data.products.length).toBeGreaterThanOrEqual(2);
  expect(json.data.campaigns.length).toBeGreaterThanOrEqual(2);
});
