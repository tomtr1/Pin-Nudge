"use client";

import * as React from "react";
import { Dialog as DialogPrimitive, AlertDialog as AlertPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlayClass =
  "fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0";
const contentClass =
  "fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-[4px] border border-foreground bg-surface p-6 shadow-[6px_6px_0_0_var(--foreground)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content className={cn(contentClass, className)} {...props}>
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1 pr-6", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-2xl", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  pending,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger> : null}
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayClass} />
        <AlertPrimitive.Content className={cn(contentClass, "max-w-md")}>
          <div className="space-y-1">
            <AlertPrimitive.Title className="font-display text-2xl">{title}</AlertPrimitive.Title>
            <AlertPrimitive.Description className="text-sm text-muted-foreground">{description}</AlertPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel className={buttonVariants({ variant: "secondary" })}>Cancel</AlertPrimitive.Cancel>
            <AlertPrimitive.Action
              className={buttonVariants({ variant: "danger" })}
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void onConfirm();
              }}
            >
              {pending ? "Working…" : confirmLabel}
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
