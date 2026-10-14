import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const API = "/api/mobile/v1";

test("mobile API: token auth, product with image, campaign generation, pin workflow", async ({ request }) => {
  const status = await (await request.get(`${API}/status`)).json();
  expect(status.data).toMatchObject({ apiVersion: 1, auth: "local-demo" });

  expect((await request.get(`${API}/me`)).status()).toBe(401);
  expect((await request.get(`${API}/me`, { headers: { Authorization: "Bearer not.a.valid-token" } })).status()).toBe(401);

  const session = (await (await request.post(`${API}/auth/local-demo`)).json()).data;
  const headers = { Authorization: `Bearer ${session.accessToken}` };

  const me = (await (await request.get(`${API}/me`, { headers })).json()).data;
  expect(me.plan.id).toBe("free");
  expect(JSON.stringify(me)).not.toContain("upgradeTo");

  const bad = await request.post(`${API}/products`, { headers, data: { name: "" } });
  expect(bad.status()).toBe(422);

  const created = await request.post(`${API}/products`, {
    headers,
    data: { name: "Mobile API planner", category: "planner", mainBenefit: "Plan the week in ten minutes", keywords: ["weekly planner"] },
  });
  expect(created.status()).toBe(201);
  const productId = (await created.json()).data.id;

  const png = readFileSync(path.join(__dirname, "fixtures/product.png"));
  const upload = await request.post(`${API}/products/${productId}/images`, {
    headers,
    multipart: { images: { name: "product.png", mimeType: "image/png", buffer: png } },
  });
  expect(upload.status()).toBe(201);
  expect((await upload.json()).data.images).toHaveLength(1);
  const fake = await request.post(`${API}/products/${productId}/images`, {
    headers,
    multipart: { images: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<svg/>") } },
  });
  expect(fake.status()).toBe(422);

  const campaign = await request.post(`${API}/campaigns`, { headers, data: { productId, config: { pinCount: 3, angleCount: 2 } } });
  expect(campaign.status()).toBe(201);
  const campaignId = (await campaign.json()).data.id;

  const angles = (await (await request.post(`${API}/campaigns/${campaignId}/angles`, { headers })).json()).data.angles;
  expect(angles.length).toBe(2);
  const edit = await request.put(`${API}/angles/${angles[1].id}`, { headers, data: { ...angles[1], selected: false } });
  expect(edit.ok()).toBe(true);

  const withPins = (await (await request.post(`${API}/campaigns/${campaignId}/pins`, { headers })).json()).data;
  expect(withPins.pins).toHaveLength(3);
  const pin = withPins.pins[0];

  const image = await request.get(`/api/pins/${pin.id}/image?size=thumb`, { headers });
  expect(image.headers()["content-type"]).toBe("image/png");

  const early = await request.put(`${API}/pins/${pin.id}/status`, { headers, data: { status: "published" } });
  expect(early.status()).toBe(409);
  const approved = await request.post(`${API}/campaigns/${campaignId}/approve-all`, { headers });
  expect((await approved.json()).data.approved).toBe(3);
  const published = await request.put(`${API}/pins/${pin.id}/status`, { headers, data: { status: "published" } });
  expect((await published.json()).data.publishedMethod).toBe("manual");

  // Free plan has no calendar: the message must not prompt a purchase.
  const plan = await request.put(`${API}/pins/${pin.id}/planned-date`, { headers, data: { date: "2026-11-02" } });
  expect(plan.status()).toBe(403);
  expect((await plan.json()).error).not.toMatch(/upgrade|starter|growth|\bpro\b/i);

  const saved = await request.put(`${API}/pins/${pin.id}`, {
    headers,
    data: { ...pin, headline: "Edited on the phone", bullets: pin.bullets, destinationUrl: pin.destinationUrl ?? "" },
  });
  expect((await saved.json()).data.headline).toBe("Edited on the phone");

  expect((await request.delete(`${API}/me`, { headers, data: { confirm: "nope" } })).status()).toBe(422);
  expect((await request.delete(`${API}/campaigns/${campaignId}`, { headers })).ok()).toBe(true);
  expect((await request.get(`${API}/campaigns/${campaignId}`, { headers })).status()).toBe(404);
});
