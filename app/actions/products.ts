"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, withUser, type ActionResult } from "@/lib/actions";
import { getAccountUsage, nextPlanWithHigherLimit } from "@/lib/billing/usage";
import { MAX_IMAGES_PER_PRODUCT, sniffImage } from "@/lib/storage/uploads";
import { fieldErrors, productInputSchema } from "@/lib/validations/schemas";
import type { Product } from "@/types/domain";

function productFromForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    category: formData.get("category") || "other",
    targetAudience: formData.get("targetAudience") ?? "",
    mainBenefit: formData.get("mainBenefit") ?? "",
    keywords: formData.get("keywords") ?? "",
    destinationUrl: formData.get("destinationUrl"),
    visualStyle: formData.get("visualStyle") ?? "",
    price: formData.get("price"),
    currency: formData.get("currency") || (formData.get("price") ? "EUR" : null),
    tags: formData.get("tags") ?? "",
  };
}

async function readImages(formData: FormData) {
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const checked = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = sniffImage(bytes);
    if (!check.ok) return { error: `${file.name.slice(0, 60)}: ${check.error}` };
    checked.push({ bytes, contentType: check.contentType, extension: check.extension });
  }
  return { images: checked };
}

export async function createProductAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return withUser("products.create", async ({ repo }) => {
    const usage = await getAccountUsage(repo);
    if (!usage.products.allowed) {
      const next = nextPlanWithHigherLimit(usage.entitlement.plan, (l) => l.products);
      return fail(`Your ${usage.entitlement.plan.name} plan includes up to ${usage.products.limit} products.${next ? ` Upgrade to ${next.name} to add more.` : ""}`, {
        code: "quota",
        upgradeTo: next?.id ?? null,
      });
    }
    const parsed = productInputSchema.safeParse(productFromForm(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    const imgs = await readImages(formData);
    if ("error" in imgs) return fail(imgs.error ?? "Invalid image.", { code: "validation", fieldErrors: { images: imgs.error ?? "" } });
    if (imgs.images.length > MAX_IMAGES_PER_PRODUCT) return fail(`Upload at most ${MAX_IMAGES_PER_PRODUCT} images.`);

    const product = await repo.createProduct({ ...parsed.data, images: [], isSample: false });
    if (imgs.images.length) {
      try {
        const uploaded = [];
        for (const img of imgs.images) uploaded.push(await repo.uploadProductImage(product.id, img));
        await repo.updateProduct(product.id, { images: uploaded });
      } catch {
        revalidatePath("/products");
        return fail("Your product was saved, but the image upload failed. Open the product to try uploading again.", {
          code: "server",
          retryable: true,
        });
      }
    }
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return ok({ id: product.id });
  });
}

export async function updateProductAction(productId: string, _prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return withUser("products.update", async ({ repo }) => {
    if (!z.uuid().safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
    const parsed = productInputSchema.safeParse(productFromForm(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    const updated = await repo.updateProduct(productId, parsed.data);
    if (!updated) return fail("Product not found.", { code: "not_found" });
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return ok({ id: productId });
  });
}

export async function uploadProductImagesAction(productId: string, formData: FormData): Promise<ActionResult<Product>> {
  return withUser("products.upload", async ({ repo }) => {
    if (!z.uuid().safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
    const product = await repo.getProduct(productId);
    if (!product) return fail("Product not found.", { code: "not_found" });
    const imgs = await readImages(formData);
    if ("error" in imgs) return fail(imgs.error ?? "Invalid image.", { code: "validation" });
    if (imgs.images.length === 0) return fail("Choose an image to upload.");
    if (product.images.length + imgs.images.length > MAX_IMAGES_PER_PRODUCT) return fail(`A product can have up to ${MAX_IMAGES_PER_PRODUCT} images.`);
    const uploaded = [];
    for (const img of imgs.images) uploaded.push(await repo.uploadProductImage(productId, img));
    const updated = await repo.updateProduct(productId, { images: [...product.images, ...uploaded] });
    revalidatePath(`/products/${productId}`);
    return updated ? ok(updated) : fail("Product not found.", { code: "not_found" });
  });
}

export async function removeProductImageAction(productId: string, index: number): Promise<ActionResult<Product>> {
  return withUser("products.removeImage", async ({ repo }) => {
    if (!z.uuid().safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
    const product = await repo.getProduct(productId);
    const image = product?.images[index];
    if (!product || !image) return fail("Image not found.", { code: "not_found" });
    const updated = await repo.updateProduct(productId, { images: product.images.filter((_, i) => i !== index) });
    await repo.deleteStoredFiles([image.path]);
    revalidatePath(`/products/${productId}`);
    return updated ? ok(updated) : fail("Product not found.", { code: "not_found" });
  });
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  return withUser("products.delete", async ({ repo }) => {
    if (!z.uuid().safeParse(productId).success) return fail("Product not found.", { code: "not_found" });
    const product = await repo.getProduct(productId);
    if (!product) return fail("Product not found.", { code: "not_found" });
    await repo.deleteProduct(productId);
    await repo.deleteStoredFiles(product.images.map((i) => i.path)).catch(() => undefined);
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return ok();
  });
}

/** Adds a clearly labelled sample product so new users can try the workflow. */
export async function addSampleProductAction(): Promise<ActionResult<{ id: string }>> {
  return withUser("products.sample", async ({ repo }) => {
    const usage = await getAccountUsage(repo);
    if (!usage.products.allowed) return fail("You've reached your product limit.", { code: "quota" });
    const product = await repo.createProduct({
      name: "Minimalist Monthly Budget Planner (sample)",
      description:
        "Sample product for exploring PinNudge. A printable and digital monthly budget planner with income and expense trackers, a savings goal page and a debt payoff tracker.",
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
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return ok({ id: product.id });
  });
}
