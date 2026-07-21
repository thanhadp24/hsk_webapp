"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo } from "@/components/layout/app-logo";
import { navItems } from "@/components/layout/nav-items";
import { isActiveNavPath, resolveNavHref } from "@/components/layout/navigation-utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const levelId = useAuthStore((state) => state.user?.current_hsk_level?.id);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Đóng menu" className="absolute inset-0 bg-slate-950/25" onClick={onClose} type="button" />
      <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <AppLogo href="/dashboard" />
          <Button onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="size-5" />
          </Button>
        </div>
        <nav className="grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const disabled = item.needsLevel && !levelId;
            const href = disabled ? "/hsk" : resolveNavHref(item.href, levelId);
            const active = !disabled && isActiveNavPath(pathname, href, item.href);
            return (
              <Link
                className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground", active && "bg-[var(--primary-soft)] text-primary")}
                href={href}
                key={item.href}
                onClick={onClose}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
