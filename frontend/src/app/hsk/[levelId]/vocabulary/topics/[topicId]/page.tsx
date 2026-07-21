"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { VocabularyCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { catalogApi, vocabularyApi } from "@/services/api";

export default function VocabularyListPage() {
  const params = useParams<{ levelId: string; topicId: string }>();
  const levelId = Number(params.levelId);
  const topicId = Number(params.topicId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const topicQuery = useQuery({ queryKey: ["topic", topicId], queryFn: () => catalogApi.topics({ page_size: 100 }).then((data) => data.results.find((topic) => topic.id === topicId)), enabled: Boolean(topicId) });
  const vocabQuery = useQuery({
    queryKey: ["vocabulary", levelId, topicId, debouncedSearch, page],
    queryFn: () => vocabularyApi.list({ level_hsk_id: levelId, topic_id: topicId, search: debouncedSearch, page, ordering: "order_number" }),
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader breadcrumbs={[{ label: "Từ vựng", href: `/hsk/${levelId}/vocabulary` }, { label: topicQuery.data?.name || "Chủ đề" }]} title={topicQuery.data?.name || `Từ vựng HSK ${levelId}`} description={typeof vocabQuery.data?.count === "number" ? `${vocabQuery.data.count} kết quả` : "Học từ vựng theo chủ đề."} />
        <div className="mb-5 max-w-xl"><SearchInput onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Tìm chữ Trung, pinyin hoặc nghĩa Việt..." value={search} /></div>
        {vocabQuery.isLoading ? <LoadingSkeleton /> : vocabQuery.isError ? <ErrorState onRetry={() => vocabQuery.refetch()} /> : vocabQuery.data?.results.length ? (
          <>
            <div className="grid gap-3">{vocabQuery.data.results.map((item) => <VocabularyCard key={item.id} vocabulary={item} />)}</div>
            <PaginationControls count={vocabQuery.data.count} onPageChange={setPage} page={page} />
          </>
        ) : <EmptyState title="Chưa có từ vựng trong chủ đề này." />}
      </PageContainer>
    </AppShell>
  );
}
