"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { removeProductImageAction, uploadProductImagesAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { ACCEPT_ATTRIBUTE, MAX_IMAGES_PER_PRODUCT, MAX_UPLOAD_BYTES } from "@/lib/storage/uploads";
import type { Product } from "@/types/domain";
import { ProductThumb } from "./product-thumb";

export function ImageManager({ product }: { product: Product }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const tooBig = [...files].find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) return void toast.error(`${tooBig.name} is larger than 5 MB.`);
    const data = new FormData();
    for (const f of files) data.append("images", f);
    start(async () => {
      const res = await uploadProductImagesAction(product.id, data);
      if (input.current) input.current.value = "";
      if (!res.ok) return void toast.error("Upload failed", { description: res.error });
      toast.success("Image uploaded");
      router.refresh();
    });
  }

  function remove(index: number) {
    start(async () => {
      const res = await removeProductImageAction(product.id, index);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Image removed");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {product.images.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
          No images yet. Pins will use text-led designs until you add one. Images are shown exactly as uploaded — use your own mockups or screenshots.
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {product.images.map((img, i) => (
            <li key={img.path} className="group relative">
              <ProductThumb product={product} index={i} />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={pending}
                className="absolute right-1 top-1 rounded-md bg-surface/90 p-1 text-danger opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove image ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept={ACCEPT_ATTRIBUTE} multiple className="sr-only" id="product-image-upload" onChange={(e) => upload(e.target.files)} />
      <Button
        variant="secondary"
        size="sm"
        disabled={pending || product.images.length >= MAX_IMAGES_PER_PRODUCT}
        onClick={() => input.current?.click()}
      >
        {pending ? <Spinner /> : <Upload />} Upload image
      </Button>
      <p className="text-xs text-muted-foreground">PNG or JPEG, up to 5 MB, {MAX_IMAGES_PER_PRODUCT} images max.</p>
    </div>
  );
}
