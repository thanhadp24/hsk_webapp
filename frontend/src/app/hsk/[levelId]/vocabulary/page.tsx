"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { TopicCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { catalogApi } from "@/services/api";

export default function VocabularyTopicsPage() {
  const params = useParams<{ levelId: string }>();
  const levelId = Number(params.levelId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const topicsQuery = useQuery({
    queryKey: ["topics", "vocabulary", levelId, debouncedSearch],
    queryFn: () => catalogApi.topics({ level_hsk_id: levelId, content_type: "VOCABULARY", search: debouncedSearch, page_size: 100 }),
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader breadcrumbs={[{ label: "HSK", href: "/hsk" }, { label: `HSK ${levelId}`, href: `/hsk/${levelId}` }, { label: "Từ vựng" }]} title={`Từ vựng HSK ${levelId}`} description="Chọn chủ đề để học từ vựng, nghe audio và lưu từ yêu thích." />
        <div className="mb-5 max-w-xl"><SearchInput onChange={setSearch} placeholder="Tìm chủ đề..." value={search} /></div>
        {topicsQuery.isLoading ? <LoadingSkeleton /> : topicsQuery.isError ? <ErrorState onRetry={() => topicsQuery.refetch()} /> : topicsQuery.data?.results.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topicsQuery.data.results.map((topic) => <TopicCard count={topic.vocabulary_count} href={`/hsk/${levelId}/vocabulary/topics/${topic.id}`} key={topic.id} topic={topic} />)}
          </div>
        ) : <EmptyState title="Chưa có chủ đề từ vựng cho cấp độ này." />}
      </PageContainer>
    </AppShell>
  );
}
