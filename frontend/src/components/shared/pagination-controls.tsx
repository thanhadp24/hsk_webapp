"use client";

import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  count,
  pageSize = 20,
  onPageChange,
}: {
  page: number;
  count: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Trang {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button" variant="outline">
          Trước
        </Button>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button" variant="outline">
          Sau
        </Button>
      </div>
    </div>
  );
}
