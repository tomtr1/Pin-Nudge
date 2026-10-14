"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Product } from "@/types/domain";
import { ProductForm } from "./product-form";

export function ProductActions({ product, campaignCount }: { product: Product; campaignCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Dialog open={editing} onOpenChange={setEditing}>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>Changes apply to new campaigns. Existing campaigns keep the details they were created with.</DialogDescription>
          </DialogHeader>
          <ProductForm
            product={product}
            onSaved={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" className="text-danger hover:bg-danger-soft">
            <Trash2 /> Delete
          </Button>
        }
        title={`Delete “${product.name}”?`}
        description={
          campaignCount > 0
            ? `This removes the product and its images. Its ${campaignCount} campaign(s) will be kept but no longer linked to a product.`
            : "This removes the product and its uploaded images. This can't be undone."
        }
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteProductAction(product.id);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Product deleted");
            router.push("/products");
          })
        }
      />
    </div>
  );
}
