"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AttemptCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { exercisesApi } from "@/services/api";

export default function ExerciseHistoryPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["attempts", page], queryFn: () => exercisesApi.attempts({ page }) });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Lịch sử làm bài" description="Các lần nộp bài được lưu trong database." />
        {query.isLoading ? <LoadingSkeleton /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.data?.results.length ? (
          <>
            <div className="grid gap-3">{query.data.results.map((attempt) => <AttemptCard attempt={attempt} key={attempt.id} />)}</div>
            <PaginationControls count={query.data.count} onPageChange={setPage} page={page} />
          </>
        ) : <EmptyState title="Bạn chưa nộp bài tập nào." />}
      </PageContainer>
    </AppShell>
  );
}
