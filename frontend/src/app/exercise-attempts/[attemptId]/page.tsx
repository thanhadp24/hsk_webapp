"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { AudioButton } from "@/components/shared/audio-button";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { formatScorePair } from "@/lib/format";
import { exercisesApi } from "@/services/api";

export default function AttemptDetailPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);
  const query = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => exercisesApi.attemptDetail(attemptId),
    enabled: Boolean(attemptId),
  });
  const attempt = query.data;

  return (
    <AppShell>
      <PageContainer>
        {query.isLoading ? (
          <LoadingSkeleton />
        ) : query.isError || !attempt ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Lịch sử", href: "/exercise-history" },
                { label: "Kết quả" },
              ]}
              title="Kết quả bài tập"
              description={attempt.exercise_set.title}
            />
            <section className="learning-card grid gap-4 p-5 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Điểm</p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {formatScorePair(attempt.score, attempt.total_score)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đúng</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--success)]">{attempt.correct_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sai</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--danger)]">{attempt.wrong_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kết quả</p>
                <p className="mt-1 text-2xl font-semibold">{attempt.passed ? "Đạt" : "Chưa đạt"}</p>
              </div>
            </section>
            <section className="mt-6 grid gap-3">
              {attempt.answers?.map((answer) => {
                const selectedText = answer.selected_option?.option_text || answer.answer_text || "Chưa trả lời";
                return (
                  <article className="learning-card p-5" key={answer.question_id}>
                    <div className="flex items-start gap-3">
                      {answer.is_correct ? (
                        <CheckCircle2 className="mt-1 size-5 text-[var(--success)]" />
                      ) : (
                        <XCircle className="mt-1 size-5 text-[var(--danger)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-chinese text-xl font-semibold">{answer.question_text}</h2>
                          <AudioButton text={answer.question_text} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <p>
                            Bạn chọn: <span className="font-medium">{selectedText}</span>
                          </p>
                          {answer.selected_option?.option_text || answer.selected_option?.audio_url ? (
                            <AudioButton text={answer.selected_option?.option_text} url={answer.selected_option?.audio_url} />
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <p>
                            Đáp án đúng:{" "}
                            <span className="font-medium">
                              {answer.correct_option?.option_text || "Chưa có đáp án đúng"}
                            </span>
                          </p>
                          {answer.correct_option?.option_text || answer.correct_option?.audio_url ? (
                            <AudioButton text={answer.correct_option?.option_text} url={answer.correct_option?.audio_url} />
                          ) : null}
                        </div>
                        {answer.explanation ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer.explanation}</p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
