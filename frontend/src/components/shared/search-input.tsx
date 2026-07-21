"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        className="h-11 w-full rounded-xl border border-border bg-white pl-9 pr-10 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {value ? (
        <Button
          aria-label="Xoa tim kiem"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={() => onChange("")}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
