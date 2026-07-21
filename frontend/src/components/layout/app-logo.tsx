import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  href?: string;
  showText?: boolean;
};

export function AppLogo({ className, href = "/", showText = true }: AppLogoProps) {
  return (
    <Link aria-label="Tieng Trung Cho Be IU" className={cn("flex min-w-fit items-center gap-2 font-semibold", className)} href={href}>
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full border border-emerald-200 bg-white shadow-sm">
        <Image alt="" className="object-cover" fill priority sizes="44px" src="/icons/logo.jpg" />
      </span>
      {showText ? <span className="hidden leading-tight sm:inline">Tieng Trung Cho Be IU</span> : null}
    </Link>
  );
}
