"use client";

import * as React from "react";
import { Tabs as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      className={cn("inline-flex h-10 items-center gap-0 border-b border-border text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        "-mb-px inline-flex h-10 items-center justify-center border-b-2 border-transparent px-3 text-sm font-semibold transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content className={cn("mt-4", className)} {...props} />;
}
