"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { stopAllAudio } from "@/lib/audio-control";

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      stopAllAudio();
      previousPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => () => stopAllAudio(), []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuClick={() => setDrawerOpen(true)} />
      <div className="flex">
        <DesktopSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <MobileNavigation />
      <MobileDrawer onClose={() => setDrawerOpen(false)} open={drawerOpen} />
    </div>
  );
}
