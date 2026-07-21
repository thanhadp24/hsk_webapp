"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { AttemptCard, ModuleCard, VocabularyCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { exercisesApi, vocabularyApi } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const levelId = user?.current_hsk_level?.id;
  const savedQuery = useQuery({
    queryKey: ["saved-vocabularies", "dashboard"],
    queryFn: () => vocabularyApi.saved({ page_size: 3 }),
    enabled: Boolean(user),
  });
  const attemptsQuery = useQuery({
    queryKey: ["attempts", "dashboard"],
    queryFn: () => exercisesApi.attempts(),
    enabled: Boolean(user),
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title={`Chào mừng${user?.full_name ? `, ${user.full_name}` : ""}`}
          description={levelId ? `Bạn đang học ${user?.current_hsk_level?.name}. Chọn một module để tiếp tục.` : "Hãy chọn cấp độ HSK để bắt đầu lộ trình học."}
          action={<Link href="/hsk"><Button variant="outline">{levelId ? "Đổi cấp độ" : "Chọn HSK"}</Button></Link>}
        />

        {levelId ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ModuleCard description="Học từ theo chủ đề, nghe audio và lưu từ." href={`/hsk/${levelId}/vocabulary`} icon="vocabulary" title="Từ vựng" />
            <ModuleCard description="Ôn nhanh bằng mặt trước, mặt sau." href={`/hsk/${levelId}/flashcards`} icon="flashcard" title="Flashcard" />
            <ModuleCard description="Đọc cấu trúc và ví dụ theo chủ đề." href={`/hsk/${levelId}/grammar`} icon="grammar" title="Ngữ pháp" />
            <ModuleCard description="Học bằng tranh và hình minh họa." href={`/hsk/${levelId}/visual-learning`} icon="visual" title="Học qua ảnh" />
            <ModuleCard description="Làm trắc nghiệm và xem kết quả." href={`/hsk/${levelId}/exercises`} icon="exercise" title="Bài tập" />
          </section>
        ) : (
          <EmptyState title="Bạn chưa chọn cấp độ HSK" description="Chọn HSK 1-6 để mở các module học phù hợp." />
        )}

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div>
            <h2 className="section-title mb-4">Từ đã lưu gần đây</h2>
            {savedQuery.isLoading ? <LoadingSkeleton lines={3} /> : savedQuery.isError ? <ErrorState onRetry={() => savedQuery.refetch()} /> : savedQuery.data?.results.length ? (
              <div className="grid gap-3">{savedQuery.data.results.map((item) => <VocabularyCard key={item.id} vocabulary={item} />)}</div>
            ) : <EmptyState title="Bạn chưa lưu từ vựng nào." />}
          </div>
          <div>
            <h2 className="section-title mb-4">Lịch sử làm bài gần đây</h2>
            {attemptsQuery.isLoading ? <LoadingSkeleton lines={3} /> : attemptsQuery.isError ? <ErrorState onRetry={() => attemptsQuery.refetch()} /> : attemptsQuery.data?.results.length ? (
              <div className="grid gap-3">{attemptsQuery.data.results.slice(0, 3).map((item) => <AttemptCard attempt={item} key={item.id} />)}</div>
            ) : <EmptyState title="Bạn chưa nộp bài tập nào." />}
          </div>
        </section>
      </PageContainer>
    </AppShell>
  );
}
