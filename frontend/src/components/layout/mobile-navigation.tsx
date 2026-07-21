"use client";

import { BookOpen, Dumbbell, Heart, Home, SquareUser } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const pathname = usePathname();
  const levelId = useAuthStore((state) => state.user?.current_hsk_level?.id);
  const items = [
    { id: "home", label: "Trang chủ", href: "/dashboard", icon: Home },
    { id: "learn", label: "Học", href: levelId ? `/hsk/${levelId}/vocabulary` : "/hsk", icon: BookOpen },
    { id: "exercise", label: "Bài", href: levelId ? `/hsk/${levelId}/exercises` : "/hsk", icon: Dumbbell },
    { id: "saved", label: "Lưu", href: "/saved-vocabularies", icon: Heart },
    { id: "profile", label: "Tôi", href: "/profile", icon: SquareUser },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.id === "exercise" && pathname.startsWith("/exercises/"));
          return (
            <Link
              className={cn("flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground", active && "text-primary")}
              href={item.href}
              key={item.id}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
