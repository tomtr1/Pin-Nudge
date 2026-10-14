import "server-only";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { getAccountUsage, nextPlanWithHigherLimit } from "@/lib/billing/usage";
import { brand } from "@/lib/brand";
import { MAX_IMAGES_PER_PRODUCT, sniffImage } from "@/lib/storage/uploads";
import { fieldErrors, productInputSchema } from "@/lib/validations/schemas";
import type { Product } from "@/types/domain";
import type { OpCtx } from "./context";

export interface CheckedImage {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
  extension: "png" | "jpg";
}

const id = z.uuid();

/** Reads `images` files from multipart form data and validates them by magic bytes. */
export async function readImagesFromForm(formData: FormData, field = "images"): Promise<{ images: CheckedImage[] } | { error: string }> {
  const files = formData.getAll(field).filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0);
  const checked: CheckedImage[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = sniffImage(bytes);
    if (!check.ok) return { error: `${(file.name || "image").slice(0, 60)}: ${check.error}` };
    checked.push({ bytes, contentType: check.contentType, extension: check.extension });
  }
  return { images: checked };
}

export async function createProduct({ repo }: OpCtx, raw: unknown, images: CheckedImage[] = []): Promise<ActionResult<{ id: string }>> {
  const usage = await getAccountUsage(repo);
  if (!usage.products.allowed) {
    const next = nextPlanWithHigherLimit(usage.entitlement.plan, (l) => l.products);
    return fail(`Your ${usage.entitlement.plan.name} plan includes up to ${usage.products.limit} products.${next ? ` Upgrade to ${next.name} to add more.` : ""}`, {
      code: "quota",
      upgradeTo: next?.id ?? null,
    });
  }
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  if (images.length > MAX_IMAGES_PER_PRODUCT) return fail(`Upload at most ${MAX_IMAGES_PER_PRODUCT} images.`, { code: "validation" });

  const product = await repo.createProduct({ ...parsed.data, images: [], isSample: false });
  if (images.length) {
    try {
      const uploaded = [];
      for (const img of images) uploaded.push(await repo.uploadProductImage(product.id, img));
      await repo.updateProduct(product.id, { images: uploaded });
    } catch {
      return fail("Your product was saved, but the image upload failed. Open the product to try uploading again.", { code: "server", retryable: true });
    }
  }
  return ok({ id: product.id });
}

export async function updateProduct({ repo }: OpCtx, productId: string, raw: unknown): Promise<ActionResult<Product>> {
  if (!id.safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  const updated = await repo.updateProduct(productId, parsed.data);
  return updated ? ok(updated) : fail("Product not found.", { code: "not_found" });
}

export async function addProductImages({ repo }: OpCtx, productId: string, images: CheckedImage[]): Promise<ActionResult<Product>> {
  if (!id.safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
  const product = await repo.getProduct(productId);
  if (!product) return fail("Product not found.", { code: "not_found" });
  if (images.length === 0) return fail("Choose an image to upload.", { code: "validation" });
  if (product.images.length + images.length > MAX_IMAGES_PER_PRODUCT) return fail(`A product can have up to ${MAX_IMAGES_PER_PRODUCT} images.`, { code: "validation" });
  const uploaded = [];
  for (const img of images) uploaded.push(await repo.uploadProductImage(productId, img));
  const updated = await repo.updateProduct(productId, { images: [...product.images, ...uploaded] });
  return updated ? ok(updated) : fail("Product not found.", { code: "not_found" });
}

export async function removeProductImage({ repo }: OpCtx, productId: string, index: number): Promise<ActionResult<Product>> {
  if (!id.safeParse(productId).success || !Number.isInteger(index)) return fail("Product not found.", { code: "not_found" });
  const product = await repo.getProduct(productId);
  const image = product?.images[index];
  if (!product || !image) return fail("Image not found.", { code: "not_found" });
  const updated = await repo.updateProduct(productId, { images: product.images.filter((_, i) => i !== index) });
  await repo.deleteStoredFiles([image.path]);
  return updated ? ok(updated) : fail("Product not found.", { code: "not_found" });
}

export async function deleteProduct({ repo }: OpCtx, productId: string): Promise<ActionResult> {
  if (!id.safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
  const product = await repo.getProduct(productId);
  if (!product) return fail("Product not found.", { code: "not_found" });
  await repo.deleteProduct(productId);
  await repo.deleteStoredFiles(product.images.map((i) => i.path)).catch(() => undefined);
  return ok();
}

/** Adds a clearly labelled sample product so new users can try the workflow. */
export async function addSampleProduct({ repo }: OpCtx): Promise<ActionResult<{ id: string }>> {
  const usage = await getAccountUsage(repo);
  if (!usage.products.allowed) return fail("You've reached your product limit.", { code: "quota" });
  const product = await repo.createProduct({
    name: "Minimalist Monthly Budget Planner (sample)",
    description: `Sample product for exploring ${brand.name}. A printable and digital monthly budget planner with income and expense trackers, a savings goal page and a debt payoff tracker.`,
    category: "spreadsheet",
    targetAudience: "People who want a simple way to manage their monthly money",
    mainBenefit: "See where your money goes each month in one calm, simple layout",
    keywords: ["budget planner", "monthly budget", "savings tracker", "printable planner"],
    destinationUrl: null,
    images: [],
    visualStyle: "minimal",
    price: null,
    currency: null,
    tags: ["sample"],
    isSample: true,
  });
  return ok({ id: product.id });
}
