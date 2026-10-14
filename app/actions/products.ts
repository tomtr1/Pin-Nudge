"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, withUser, type ActionResult } from "@/lib/actions";
import * as products from "@/lib/operations/products";
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

export async function createProductAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return withUser("products.create", async (ctx) => {
    const imgs = await products.readImagesFromForm(formData);
    if ("error" in imgs) return fail(imgs.error, { code: "validation", fieldErrors: { images: imgs.error } });
    const result = await products.createProduct(ctx, productFromForm(formData), imgs.images);
    if (result.ok || result.code === "server") {
      revalidatePath("/products");
      revalidatePath("/dashboard");
    }
    return result;
  });
}

export async function updateProductAction(productId: string, _prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return withUser("products.update", async (ctx) => {
    const result = await products.updateProduct(ctx, productId, productFromForm(formData));
    if (!result.ok) return result;
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return ok({ id: productId });
  });
}

export async function uploadProductImagesAction(productId: string, formData: FormData): Promise<ActionResult<Product>> {
  return withUser("products.upload", async (ctx) => {
    const imgs = await products.readImagesFromForm(formData);
    if ("error" in imgs) return fail(imgs.error, { code: "validation" });
    const result = await products.addProductImages(ctx, productId, imgs.images);
    if (result.ok) revalidatePath(`/products/${productId}`);
    return result;
  });
}

export async function removeProductImageAction(productId: string, index: number): Promise<ActionResult<Product>> {
  return withUser("products.removeImage", async (ctx) => {
    const result = await products.removeProductImage(ctx, productId, index);
    if (result.ok) revalidatePath(`/products/${productId}`);
    return result;
  });
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  return withUser("products.delete", async (ctx) => {
    const result = await products.deleteProduct(ctx, productId);
    if (result.ok) {
      revalidatePath("/products");
      revalidatePath("/dashboard");
    }
    return result;
  });
}

/** Adds a clearly labelled sample product so new users can try the workflow. */
export async function addSampleProductAction(): Promise<ActionResult<{ id: string }>> {
  return withUser("products.sample", async (ctx) => {
    const result = await products.addSampleProduct(ctx);
    if (result.ok) {
      revalidatePath("/products");
      revalidatePath("/dashboard");
    }
    return result;
  });
}
