/* eslint-disable @next/next/no-img-element -- private product images served by our own API */
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

export function ProductThumb({ product, index = 0, className }: { product: Pick<Product, "id" | "images" | "name" | "updatedAt">; index?: number; className?: string }) {
  if (!product.images[index]) {
    return (
      <div className={cn("flex aspect-square w-full items-center justify-center rounded-md border border-border bg-surface-muted text-muted-foreground", className)}>
        <ImageOff className="size-5" aria-hidden />
        <span className="sr-only">No product image</span>
      </div>
    );
  }
  return (
    <img
      src={`/api/products/${product.id}/images/${index}?v=${encodeURIComponent(product.updatedAt)}`}
      alt={`${product.name}${index ? ` — image ${index + 1}` : ""}`}
      loading="lazy"
      className={cn("aspect-square w-full rounded-md border border-border bg-surface-muted object-cover", className)}
    />
  );
}
