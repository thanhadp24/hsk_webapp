"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { VisualCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { visualApi } from "@/services/api";

const PAGE_SIZE = 12;

export default function VisualLearningPage() {
  const params = useParams<{ levelId: string }>();
  const levelId = Number(params.levelId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const query = useQuery({
    queryKey: ["visual", levelId, debouncedSearch, page],
    queryFn: () => visualApi.list({ level_hsk_id: levelId, search: debouncedSearch, page, page_size: PAGE_SIZE }),
  });
  const images = query.data?.results ?? [];
  const activeImage = activeIndex !== null && activeIndex < images.length ? images[activeIndex] : undefined;

  const closeViewer = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const openViewer = useCallback((index: number) => {
    setZoom(1);
    setActiveIndex(index);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    closeViewer();
  }, [closeViewer]);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    closeViewer();
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [closeViewer]);

  const showPrevious = useCallback(() => {
    setZoom(1);
    setActiveIndex((current) => {
      if (current === null || images.length === 0) {
        return current;
      }
      return current === 0 ? images.length - 1 : current - 1;
    });
  }, [images.length]);

  const zoomOut = useCallback(() => setZoom((value) => Math.max(0.6, Number((value - 0.2).toFixed(1)))), []);
  const zoomIn = useCallback(() => setZoom((value) => Math.min(2.4, Number((value + 0.2).toFixed(1)))), []);

  const showNext = useCallback(() => {
    setZoom(1);
    setActiveIndex((current) => {
      if (current === null || images.length === 0) {
        return current;
      }
      return current === images.length - 1 ? 0 : current + 1;
    });
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
      }
      if (event.key === "ArrowLeft") {
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        showNext();
      }
      if (event.key === "-" || event.key === "_") {
        zoomOut();
      }
      if (event.key === "+" || event.key === "=") {
        zoomIn();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, closeViewer, images.length, showNext, showPrevious, zoomIn, zoomOut]);

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          breadcrumbs={[
            { label: "HSK", href: "/hsk" },
            { label: `HSK ${levelId}`, href: `/hsk/${levelId}` },
            { label: "Học qua ảnh" },
          ]}
          title={`Học qua ảnh HSK ${levelId}`}
          description="Các bộ hình ảnh học tập lấy từ database."
        />
        <div className="mb-5 max-w-xl">
          <SearchInput onChange={handleSearchChange} placeholder="Tìm hình ảnh học tập..." value={search} />
        </div>
        {query.isLoading ? (
          <LoadingSkeleton />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : images.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {images.map((image, index) => (
                <VisualCard image={image} key={image.id} onOpen={() => openViewer(index)} />
              ))}
            </div>
            <PaginationControls count={query.data?.count ?? images.length} onPageChange={handlePageChange} page={page} pageSize={PAGE_SIZE} />
          </>
        ) : (
          <EmptyState title="Chưa có hình ảnh học tập cho cấp độ này." />
        )}
      </PageContainer>
      {activeImage ? (
        <div aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4" role="dialog">
          <button aria-label="Đóng ảnh" className="absolute inset-0 cursor-default" onClick={closeViewer} type="button" />
          <div className="relative flex h-[80vh] w-[80vw] max-w-6xl flex-col overflow-hidden rounded-lg bg-white text-foreground shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Ảnh học tập {String(activeImage.order_number).padStart(3, "0")}</p>
                <p className="text-xs text-muted-foreground">
                  {(activeIndex ?? 0) + 1} / {images.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button aria-label="Thu nhỏ ảnh" disabled={zoom <= 0.6} onClick={zoomOut} size="icon" type="button" variant="outline">
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-12 text-center text-xs font-medium text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button aria-label="Phóng to ảnh" disabled={zoom >= 2.4} onClick={zoomIn} size="icon" type="button" variant="outline">
                  <ZoomIn className="size-4" />
                </Button>
                <Button aria-label="Đóng ảnh" onClick={closeViewer} size="icon" type="button" variant="outline">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-auto bg-white p-4 md:p-6">
              <img
                alt={`Ảnh học tập ${String(activeImage.order_number).padStart(3, "0")}`}
                className="mx-auto block h-auto max-h-none max-w-none object-contain transition-[width]"
                src={activeImage.image_url}
                style={{ width: `${zoom * 100}%` }}
              />
              {images.length > 1 ? (
                <>
                  <Button
                    aria-label="Ảnh trước"
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 text-foreground hover:bg-white md:left-4"
                    onClick={showPrevious}
                    size="icon-lg"
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    aria-label="Ảnh kế tiếp"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/95 text-foreground hover:bg-white md:right-4"
                    onClick={showNext}
                    size="icon-lg"
                    type="button"
                    variant="outline"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
