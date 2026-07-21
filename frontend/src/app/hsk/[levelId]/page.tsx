"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ModuleCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { catalogApi } from "@/services/api";

export default function HskOverviewPage() {
  const params = useParams<{ levelId: string }>();
  const levelId = Number(params.levelId);
  const levelQuery = useQuery({ queryKey: ["hsk-level", levelId], queryFn: () => catalogApi.level(levelId), enabled: Boolean(levelId) });

  return (
    <AppShell>
      <PageContainer>
        {levelQuery.isLoading ? <LoadingSkeleton lines={2} /> : levelQuery.isError || !levelQuery.data ? <ErrorState onRetry={() => levelQuery.refetch()} /> : (
          <>
            <PageHeader breadcrumbs={[{ label: "HSK", href: "/hsk" }, { label: levelQuery.data.name }]} title={levelQuery.data.name} description={levelQuery.data.description || "Chọn module để bắt đầu học."} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <ModuleCard description="Danh sách chủ đề và từ vựng." href={`/hsk/${levelId}/vocabulary`} icon="vocabulary" title="Từ vựng" />
              <ModuleCard description="Cấu trúc, cách dùng và ví dụ." href={`/hsk/${levelId}/grammar`} icon="grammar" title="Ngữ pháp" />
              <ModuleCard description="Ôn tập nhanh theo flashcard." href={`/hsk/${levelId}/flashcards`} icon="flashcard" title="Flashcard" />
              <ModuleCard description="Học từ bằng hình ảnh." href={`/hsk/${levelId}/visual-learning`} icon="visual" title="Học qua ảnh" />
              <ModuleCard description="Bài tập trắc nghiệm." href={`/hsk/${levelId}/exercises`} icon="exercise" title="Bài tập" />
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
