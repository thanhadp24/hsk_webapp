"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/components/layout/nav-items";
import { isActiveNavPath, resolveNavHref } from "@/components/layout/navigation-utils";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const pathname = usePathname();
  const levelId = useAuthStore((state) => state.user?.current_hsk_level?.id);

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-white p-4 lg:block">
      <nav className="grid gap-1">
        {navItems.map((item) => {
          const disabled = item.needsLevel && !levelId;
          const href = resolveNavHref(item.href, levelId);
          const active = !disabled && isActiveNavPath(pathname, href, item.href);
          const Icon = item.icon;
          return (
            <Link
              aria-disabled={disabled}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition",
                active && "bg-[var(--primary-soft)] text-primary",
                !active && !disabled && "hover:bg-muted hover:text-foreground",
                disabled && "pointer-events-none opacity-45",
              )}
              href={disabled ? "/hsk" : href}
              key={item.href}
              title={disabled ? "Hãy chọn cấp độ HSK trước" : item.label}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
