"use client";

import Link from "next/link";
import { ChevronsUpDown, CreditCard, LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";

export function AccountMenu({ name, email, planName }: { name: string; email: string | null; planName: string }) {
  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-surface-muted" aria-label="Account menu">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-foreground">{initial}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name || "Your account"}</span>
          <span className="block truncate text-xs text-muted-foreground">{planName} plan</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{email}</span>
          <Badge tone="accent" className="mt-1">{planName}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings#billing"><CreditCard /> Plan &amp; billing</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOutAction()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
