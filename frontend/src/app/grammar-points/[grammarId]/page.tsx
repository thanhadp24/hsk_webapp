"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AudioButton } from "@/components/shared/audio-button";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { grammarApi } from "@/services/api";

export default function GrammarDetailPage() {
  const params = useParams<{ grammarId: string }>();
  const router = useRouter();
  const grammarId = Number(params.grammarId);
  const query = useQuery({
    queryKey: ["grammar", grammarId],
    queryFn: () => grammarApi.detail(grammarId),
    enabled: Boolean(grammarId),
  });
  const grammar = query.data;
  const previousId = grammar?.previous_id;
  const nextId = grammar?.next_id;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a")) {
        return;
      }
      if (event.key === "ArrowLeft" && previousId) {
        router.push(`/grammar-points/${previousId}`);
      }
      if (event.key === "ArrowRight" && nextId) {
        router.push(`/grammar-points/${nextId}`);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextId, previousId, router]);

  return (
    <AppShell>
      <PageContainer>
        {query.isLoading ? (
          <LoadingSkeleton lines={3} />
        ) : query.isError || !grammar ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          <>
            <PageHeader
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!previousId}
                    onClick={() => previousId && router.push(`/grammar-points/${previousId}`)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowLeft className="size-4" />
                    Trước
                  </Button>
                  <Button
                    disabled={!nextId}
                    onClick={() => nextId && router.push(`/grammar-points/${nextId}`)}
                    type="button"
                    variant="outline"
                  >
                    Sau
                    <ArrowRight className="size-4" />
                  </Button>
                  <AudioButton text={grammar.structure} />
                </div>
              }
              breadcrumbs={[
                { label: grammar.level_hsk.name, href: `/hsk/${grammar.level_hsk.id}` },
                { label: "Ngữ pháp", href: `/hsk/${grammar.level_hsk.id}/grammar` },
                { label: grammar.title },
              ]}
              description={grammar.meaning_vi}
              title={grammar.title}
            />
            <article className="learning-card p-6">
              <p className="rounded-xl bg-muted p-4 font-chinese text-lg leading-8">{grammar.structure}</p>
              <p className="mt-5 leading-8">{grammar.explanation}</p>
              {grammar.note ? (
                <p className="mt-4 rounded-xl bg-[var(--primary-soft)] p-4 text-sm leading-6">{grammar.note}</p>
              ) : null}
            </article>
            <section className="mt-6">
              <h2 className="section-title mb-4">Câu ví dụ</h2>
              {grammar.examples?.length ? (
                <div className="grid gap-3">
                  {grammar.examples.map((example) => (
                    <article className="learning-card p-5" key={example.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-chinese text-2xl">{example.sentence_chinese}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{example.pinyin}</p>
                          <p className="mt-2">{example.meaning_vi}</p>
                          {example.explanation ? (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.explanation}</p>
                          ) : null}
                        </div>
                        <AudioButton text={example.sentence_chinese} url={example.audio_url} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="Chưa có câu ví dụ." />
              )}
            </section>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
