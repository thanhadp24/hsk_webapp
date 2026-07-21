import { AlertCircle, Loader2, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LoadingSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div className="learning-card h-24 animate-pulse bg-white" key={index}>
          <div className="h-full rounded-2xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="learning-card flex min-h-52 flex-col items-center justify-center p-8 text-center">
      <SearchX className="mb-3 size-8 text-muted-foreground" />
      <h3 className="font-semibold">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="learning-card flex min-h-52 flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="mb-3 size-8 text-[var(--danger)]" />
      <h3 className="font-semibold">Không tải được dữ liệu</h3>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng thử lại sau ít phút.</p>
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry} type="button">
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}

export function InlineLoading() {
  return <Loader2 className="size-4 animate-spin" />;
}
