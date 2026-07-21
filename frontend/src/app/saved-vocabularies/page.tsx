"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { VocabularyCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { vocabularyApi } from "@/services/api";

export default function SavedVocabulariesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const query = useQuery({ queryKey: ["saved-vocabularies", debouncedSearch, page], queryFn: () => vocabularyApi.saved({ search: debouncedSearch, page }) });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Từ vựng đã lưu" description="Danh sách từ bạn đã đánh dấu bằng trái tim." />
        <div className="mb-5 max-w-xl"><SearchInput onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Tìm trong từ đã lưu..." value={search} /></div>
        {query.isLoading ? <LoadingSkeleton /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.data?.results.length ? (
          <>
            <div className="grid gap-3">{query.data.results.map((item) => <VocabularyCard key={item.id} vocabulary={item} />)}</div>
            <PaginationControls count={query.data.count} onPageChange={setPage} page={page} />
          </>
        ) : <EmptyState title="Bạn chưa lưu từ vựng nào." />}
      </PageContainer>
    </AppShell>
  );
}
