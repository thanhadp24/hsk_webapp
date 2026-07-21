"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ExerciseCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { exercisesApi } from "@/services/api";

const EXERCISE_MODES = [
  { code: "", label: "Tất cả", description: "Xem toàn bộ bài tập." },
  { code: "PRACTICE", label: "Luyện tập", description: "Làm từng câu, ôn kỹ năng." },
  { code: "TEST", label: "Kiểm tra", description: "Tự đánh giá nhanh." },
  { code: "MOCK_EXAM", label: "Thi thử", description: "Theo cấu trúc đề thật." },
] as const;

export default function ExercisesPage() {
  const params = useParams<{ levelId: string }>();
  const levelId = Number(params.levelId);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<(typeof EXERCISE_MODES)[number]["code"]>("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const query = useQuery({
    queryKey: ["exercise-sets", levelId, debouncedSearch, mode, page],
    queryFn: () => exercisesApi.list({ level_hsk_id: levelId, search: debouncedSearch, exercise_mode: mode, page }),
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader breadcrumbs={[{ label: "HSK", href: "/hsk" }, { label: `HSK ${levelId}`, href: `/hsk/${levelId}` }, { label: "Bài tập" }]} title={`Bài tập HSK ${levelId}`} description="Chọn bộ bài tập, làm bài và nộp đáp án để xem kết quả." />
        <div className="mb-5 grid gap-4">
          <div className="max-w-xl"><SearchInput onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Tìm bài tập..." value={search} /></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {EXERCISE_MODES.map((item) => {
              const active = mode === item.code;
              return (
                <Button
                  className={cn("h-auto justify-start rounded-lg border p-3 text-left", active && "border-primary bg-[var(--primary-soft)] text-primary")}
                  key={item.code || "ALL"}
                  onClick={() => {
                    setPage(1);
                    setMode(item.code);
                  }}
                  type="button"
                  variant="outline"
                >
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{item.description}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
        {query.isLoading ? <LoadingSkeleton /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.data?.results.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.results.map((exercise) => <ExerciseCard exercise={exercise} key={exercise.id} />)}</div>
            <PaginationControls count={query.data.count} onPageChange={setPage} page={page} />
          </>
        ) : <EmptyState title="Chưa có bộ bài tập phù hợp." />}
      </PageContainer>
    </AppShell>
  );
}
