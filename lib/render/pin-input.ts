import "server-only";
import { CATEGORY_KICKERS } from "@/lib/constants";
import type { UserRepository } from "@/lib/data";
import type { Pin, PinDesign, Product, Profile } from "@/types/domain";
import { toDataUri, type PinRenderInput } from "./index";

/** Load the product image (owner-scoped) the pin's design points at, as a data URI. */
async function loadImage(repo: UserRepository, product: Product | null, design: PinDesign) {
  if (!product || product.images.length === 0 || design.imagePlacement === "none") return null;
  const img = product.images[Math.min(design.imageIndex, product.images.length - 1)];
  const file = await repo.readProductImage(img.path);
  if (!file) return null;
  return { dataUri: toDataUri(file.bytes, file.contentType), width: img.width ?? 1000, height: img.height ?? 1000 };
}

export async function renderInputForPin(
  repo: UserRepository,
  pin: Pick<Pin, "headline" | "subheadline" | "bullets" | "cta" | "design" | "productId">,
  opts: { product?: Product | null; profile?: Profile | null } = {},
): Promise<PinRenderInput> {
  const product = opts.product !== undefined ? opts.product : pin.productId ? await repo.getProduct(pin.productId) : null;
  const profile = opts.profile !== undefined ? opts.profile : await repo.getProfile();
  return {
    headline: pin.headline,
    subheadline: pin.subheadline,
    bullets: pin.bullets,
    cta: pin.cta,
    storeName: profile?.storeName ?? null,
    design: pin.design,
    image: await loadImage(repo, product, pin.design),
    kicker: product ? (CATEGORY_KICKERS[product.category] ?? CATEGORY_KICKERS.other) : null,
  };
}
