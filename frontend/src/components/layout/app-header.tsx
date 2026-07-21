"use client";

import { Menu, Search, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Button className="lg:hidden" onClick={onMenuClick} size="icon" type="button" variant="ghost">
          <Menu className="size-5" />
        </Button>
        <AppLogo href="/dashboard" />
        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <div className="flex h-10 w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
            <Search className="size-4" />
            <span>Tìm từ vựng, ngữ pháp, bài tập...</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user?.current_hsk_level ? (
            <Link className="hidden rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-sm font-medium text-primary sm:block" href={`/hsk/${user.current_hsk_level.id}`}>
              {user.current_hsk_level.name}
            </Link>
          ) : (
            <Link className="hidden text-sm text-muted-foreground hover:text-primary sm:block" href="/hsk">
              Chọn HSK
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Link className="hidden max-w-40 truncate text-sm font-medium sm:block" href="/profile">
                {user.full_name || user.email}
              </Link>
              <Button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                type="button"
                variant="outline"
              >
                Đăng xuất
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button type="button">Đăng nhập</Button>
            </Link>
          )}
          <UserCircle className="size-8 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
