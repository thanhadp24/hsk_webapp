"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { GrammarCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { grammarApi } from "@/services/api";

export default function GrammarListPage() {
  const params = useParams<{ levelId: string }>();
  const levelId = Number(params.levelId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const query = useQuery({ queryKey: ["grammar", levelId, debouncedSearch, page], queryFn: () => grammarApi.list({ level_hsk_id: levelId, search: debouncedSearch, page, ordering: "order_number" }) });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader breadcrumbs={[{ label: "HSK", href: "/hsk" }, { label: `HSK ${levelId}`, href: `/hsk/${levelId}` }, { label: "Ngữ pháp" }]} title={`Ngữ pháp HSK ${levelId}`} description="Đọc cấu trúc, ý nghĩa và ví dụ theo từng điểm ngữ pháp." />
        <div className="mb-5 max-w-xl"><SearchInput onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Tìm ngữ pháp..." value={search} /></div>
        {query.isLoading ? <LoadingSkeleton /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.data?.results.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.results.map((item) => <GrammarCard grammar={item} key={item.id} />)}</div>
            <PaginationControls count={query.data.count} onPageChange={setPage} page={page} />
          </>
        ) : <EmptyState title="Chưa có điểm ngữ pháp phù hợp." />}
      </PageContainer>
    </AppShell>
  );
}
