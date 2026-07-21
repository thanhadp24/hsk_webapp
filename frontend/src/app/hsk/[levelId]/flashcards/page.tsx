"use client";

import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AudioButton } from "@/components/shared/audio-button";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { vocabularyApi } from "@/services/api";

export default function FlashcardsPage() {
  const params = useParams<{ levelId: string }>();
  const levelId = Number(params.levelId);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const query = useQuery({
    queryKey: ["vocabulary", "flashcards", levelId],
    queryFn: () => vocabularyApi.flashcards({ level_hsk_id: levelId, limit: 80 }),
  });
  const cards = query.data ?? [];
  const current = cards[index];
  const currentExamples = current?.examples ?? [];

  function move(nextIndex: number) {
    setIndex(Math.min(Math.max(nextIndex, 0), Math.max(cards.length - 1, 0)));
    setFlipped(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) {
        return;
      }

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        setIndex(index - 1);
        setFlipped(false);
      }

      if (event.key === "ArrowRight" && index < cards.length - 1) {
        event.preventDefault();
        setIndex(index + 1);
        setFlipped(false);
      }

      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length, index]);

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          breadcrumbs={[
            { label: "HSK", href: "/hsk" },
            { label: `HSK ${levelId}`, href: `/hsk/${levelId}` },
            { label: "Flashcard" },
          ]}
          title={`Flashcard HSK ${levelId}`}
          description="Bấm vào thẻ hoặc nhấn Space để lật. Dùng phím mũi tên trái/phải để chuyển thẻ."
        />
        {query.isLoading ? (
          <LoadingSkeleton lines={3} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : current ? (
          <section className="mx-auto max-w-3xl">
            <div
              className="learning-card min-h-[360px] w-full cursor-pointer p-8 text-center transition hover:border-primary/60"
              onClick={() => setFlipped((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setFlipped((value) => !value);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {!flipped ? (
                <div className="grid min-h-[280px] place-items-center">
                  <div>
                    <p className="font-chinese text-7xl font-semibold">{current.simplified}</p>
                    <p className="mt-5 text-lg text-muted-foreground">{current.pinyin}</p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-5">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{current.meaning_vi}</p>
                    <p className="mt-3 text-muted-foreground">{current.word_type}</p>
                    {current.han_viet ? (
                      <p className="mt-2 text-sm text-muted-foreground">Hán Việt: {current.han_viet}</p>
                    ) : null}
                  </div>
                  {currentExamples.length ? (
                    <div className="w-full rounded-xl border border-border bg-muted/40 p-4 text-left">
                      <p className="text-sm font-semibold">Ví dụ chi tiết</p>
                      <div className="mt-3 max-h-48 space-y-3 overflow-y-auto pr-1">
                        {currentExamples.map((example) => (
                          <div className="border-t border-border pt-3 first:border-t-0 first:pt-0" key={example.id}>
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-chinese text-xl leading-8">{example.sentence_chinese}</p>
                              <AudioButton label="Nghe ví dụ" text={example.sentence_chinese} url={example.audio_url} />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{example.pinyin}</p>
                            <p className="mt-1 text-sm leading-6">{example.meaning_vi}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có câu ví dụ cho từ này.</p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {index + 1} / {cards.length}
              </span>
              <div className="flex flex-wrap gap-2">
                <AudioButton text={current.simplified} url={current.audio_url} />
                <Button onClick={() => setFlipped(false)} type="button" variant="outline">
                  <RotateCcw className="size-4" />
                  Lật lại
                </Button>
                <Button disabled={index <= 0} onClick={() => move(index - 1)} type="button" variant="outline">
                  Trước
                </Button>
                <Button disabled={index >= cards.length - 1} onClick={() => move(index + 1)} type="button">
                  Sau
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <EmptyState title="Chưa có flashcard cho cấp độ này." />
        )}
      </PageContainer>
    </AppShell>
  );
}
