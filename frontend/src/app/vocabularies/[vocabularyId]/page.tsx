"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AudioButton } from "@/components/shared/audio-button";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { SaveVocabularyButton } from "@/components/shared/save-vocabulary-button";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { vocabularyApi } from "@/services/api";

export default function VocabularyDetailPage() {
  const params = useParams<{ vocabularyId: string }>();
  const router = useRouter();
  const vocabularyId = Number(params.vocabularyId);
  const query = useQuery({
    queryKey: ["vocabulary", vocabularyId],
    queryFn: () => vocabularyApi.detail(vocabularyId),
    enabled: Boolean(vocabularyId),
  });
  const vocab = query.data;
  const previousId = vocab?.previous_id;
  const nextId = vocab?.next_id;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a")) {
        return;
      }
      if (event.key === "ArrowLeft" && previousId) {
        router.push(`/vocabularies/${previousId}`);
      }
      if (event.key === "ArrowRight" && nextId) {
        router.push(`/vocabularies/${nextId}`);
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
        ) : query.isError || !vocab ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          <>
            <PageHeader
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!previousId}
                    onClick={() => previousId && router.push(`/vocabularies/${previousId}`)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowLeft className="size-4" />
                    Trước
                  </Button>
                  <Button
                    disabled={!nextId}
                    onClick={() => nextId && router.push(`/vocabularies/${nextId}`)}
                    type="button"
                    variant="outline"
                  >
                    Sau
                    <ArrowRight className="size-4" />
                  </Button>
                  <AudioButton text={vocab.simplified} url={vocab.audio_url} />
                  <SaveVocabularyButton isSaved={vocab.is_saved} vocabularyId={vocab.id} />
                </div>
              }
              breadcrumbs={[
                { label: "HSK", href: "/hsk" },
                { label: vocab.level_hsk.name, href: `/hsk/${vocab.level_hsk.id}` },
                { label: vocab.simplified },
              ]}
              description={vocab.meaning_vi}
              title={vocab.simplified}
            />
            <article className="learning-card p-6">
              <div className="grid gap-5 md:grid-cols-[1fr_260px]">
                <div>
                  <p className="font-chinese text-6xl font-semibold">{vocab.simplified}</p>
                  {vocab.traditional ? (
                    <p className="mt-2 font-chinese text-2xl text-muted-foreground">{vocab.traditional}</p>
                  ) : null}
                  <p className="mt-5 text-lg text-muted-foreground">{vocab.pinyin}</p>
                  <p className="mt-3 text-xl font-semibold">{vocab.meaning_vi}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1">{vocab.word_type}</span>
                    {vocab.han_viet ? (
                      <span className="rounded-full bg-muted px-3 py-1">Hán Việt: {vocab.han_viet}</span>
                    ) : null}
                  </div>
                  {vocab.note ? (
                    <p className="mt-5 rounded-xl bg-[var(--primary-soft)] p-4 text-sm leading-6">{vocab.note}</p>
                  ) : null}
                </div>
                {vocab.image_url ? (
                  <img
                    alt={vocab.simplified}
                    className="aspect-square w-full rounded-2xl border object-cover"
                    src={vocab.image_url}
                  />
                ) : null}
              </div>
            </article>
            <section className="mt-6">
              <h2 className="section-title mb-4">Câu ví dụ</h2>
              {vocab.examples?.length ? (
                <div className="grid gap-3">
                  {vocab.examples.map((example) => (
                    <article className="learning-card p-5" key={example.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-chinese text-2xl">{example.sentence_chinese}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{example.pinyin}</p>
                          <p className="mt-2">{example.meaning_vi}</p>
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
