"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, FileText, Headphones, ListChecks } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { AudioButton } from "@/components/shared/audio-button";
import { AudioPlayer } from "@/components/shared/audio-player";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exercisesApi, getErrorMessage } from "@/services/api";
import type { ExerciseSection, ExerciseSet, Question, QuestionGroup } from "@/types/api";

type AnswerDraft = {
  selectedOptionId?: number | null;
  answerText?: string;
};

type Answers = Record<number, AnswerDraft>;

type SectionView = ExerciseSection & {
  groups: GroupView[];
  ungroupedQuestions: Question[];
};

type GroupView = QuestionGroup & {
  questions: Question[];
};

const QUESTIONS_PER_PAGE = 10;

const modeMeta: Record<string, { label: string; description: string; icon: typeof ListChecks }> = {
  PRACTICE: {
    label: "Luyện tập",
    description: "Làm theo nhịp riêng, câu trả lời được lưu tạm trên trình duyệt.",
    icon: ListChecks,
  },
  TEST: {
    label: "Kiểm tra",
    description: "Tự đánh giá năng lực theo bộ câu hỏi đã chọn.",
    icon: FileText,
  },
  MOCK_EXAM: {
    label: "Thi thử",
    description: "Hiển thị theo phần thi, nhóm câu và audio chung giống đề thực tế.",
    icon: Clock3,
  },
};

function loadSavedExercise(exerciseId: number) {
  const fallback = { answers: {}, startedAt: new Date().toISOString() };
  if (typeof window === "undefined" || !exerciseId) {
    return fallback;
  }

  const raw = window.localStorage.getItem(`hsk_exercise_${exerciseId}`);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as { answers?: Record<string, AnswerDraft | number>; startedAt?: string };
    const answers = Object.fromEntries(
      Object.entries(parsed.answers ?? {}).map(([questionId, value]) => {
        if (typeof value === "number") {
          return [questionId, { selectedOptionId: value }];
        }
        return [questionId, value ?? {}];
      }),
    );

    return {
      answers,
      startedAt: parsed.startedAt ?? fallback.startedAt,
    };
  } catch {
    return fallback;
  }
}

function isOptionQuestion(question: Question) {
  return Boolean(question.options.length) && question.question_type !== "REORDER_SENTENCE";
}

function isAnswered(question: Question, answer?: AnswerDraft) {
  if (!answer) {
    return false;
  }
  if (isOptionQuestion(question)) {
    return answer.selectedOptionId !== undefined && answer.selectedOptionId !== null;
  }
  return Boolean(answer.answerText?.trim());
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildSectionViews(exercise: ExerciseSet, questions: Question[]) {
  const sections = exercise.sections ?? [];
  const topLevelGroups = exercise.question_groups ?? [];

  if (!sections.length) {
    return [];
  }

  return sections.map((section) => {
    const sectionQuestions = questions.filter((question) => question.section_id === section.id);
    const sectionGroups = (section.question_groups?.length ? section.question_groups : topLevelGroups.filter((group) => group.section_id === section.id))
      .slice()
      .sort((a, b) => a.order_number - b.order_number);

    const groups = sectionGroups.map((group) => ({
      ...group,
      questions: sectionQuestions
        .filter((question) => question.question_group_id === group.id)
        .sort((a, b) => a.order_number - b.order_number),
    }));

    return {
      ...section,
      groups,
      ungroupedQuestions: sectionQuestions
        .filter((question) => !question.question_group_id)
        .sort((a, b) => a.order_number - b.order_number),
    };
  });
}

function filterSectionViews(sectionViews: SectionView[], visibleQuestionIds: Set<number>) {
  return sectionViews
    .map((section) => {
      const groups = section.groups
        .map((group) => ({
          ...group,
          questions: group.questions.filter((question) => visibleQuestionIds.has(question.id)),
        }))
        .filter((group) => group.questions.length > 0);
      const ungroupedQuestions = section.ungroupedQuestions.filter((question) => visibleQuestionIds.has(question.id));

      return {
        ...section,
        groups,
        ungroupedQuestions,
      };
    })
    .filter((section) => section.groups.length > 0 || section.ungroupedQuestions.length > 0);
}

function getModeMeta(exerciseMode: string) {
  return modeMeta[exerciseMode] ?? {
    label: exerciseMode,
    description: "Làm bài theo cấu hình của bộ câu hỏi này.",
    icon: ListChecks,
  };
}

export default function ExerciseDetailPage() {
  const params = useParams<{ exerciseId: string }>();
  const exerciseId = Number(params.exerciseId);
  const router = useRouter();
  const savedExercise = useMemo(() => loadSavedExercise(exerciseId), [exerciseId]);
  const autoSubmittedRef = useRef(false);
  const [answers, setAnswers] = useState<Answers>(() => savedExercise.answers);
  const [startedAt] = useState<string>(() => savedExercise.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const [questionPage, setQuestionPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const storageKey = useMemo(() => `hsk_exercise_${exerciseId}`, [exerciseId]);
  const query = useQuery({ queryKey: ["exercise-set", exerciseId], queryFn: () => exercisesApi.detail(exerciseId), enabled: Boolean(exerciseId) });

  const exercise = query.data;
  const questions = useMemo(() => (exercise?.questions ?? []).slice().sort((a, b) => a.order_number - b.order_number), [exercise?.questions]);
  const sectionViews = useMemo(() => (exercise ? buildSectionViews(exercise, questions) : []), [exercise, questions]);
  const totalQuestionPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const currentQuestionPage = Math.min(questionPage, totalQuestionPages);
  const visibleQuestions = useMemo(
    () => questions.slice((currentQuestionPage - 1) * QUESTIONS_PER_PAGE, currentQuestionPage * QUESTIONS_PER_PAGE),
    [currentQuestionPage, questions],
  );
  const visibleQuestionIds = useMemo(() => new Set(visibleQuestions.map((question) => question.id)), [visibleQuestions]);
  const visibleSectionViews = useMemo(() => filterSectionViews(sectionViews, visibleQuestionIds), [sectionViews, visibleQuestionIds]);
  const meta = exercise ? getModeMeta(exercise.exercise_mode) : null;
  const ModeIcon = meta?.icon ?? ListChecks;
  const answeredCount = useMemo(() => questions.filter((question) => isAnswered(question, answers[question.id])).length, [answers, questions]);
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const totalSeconds = exercise?.time_limit_minutes ? exercise.time_limit_minutes * 60 : null;
  const timedMode = Boolean(totalSeconds && exercise?.exercise_mode !== "PRACTICE");
  const remainingSeconds = useMemo(() => {
    if (!timedMode || !totalSeconds) {
      return null;
    }
    const elapsedSeconds = Math.floor((now - new Date(startedAt).getTime()) / 1000);
    return Math.max(totalSeconds - elapsedSeconds, 0);
  }, [now, startedAt, timedMode, totalSeconds]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ answers, startedAt }));
  }, [answers, startedAt, storageKey]);

  const mutation = useMutation({
    mutationFn: () =>
      exercisesApi.submit(exerciseId, {
        startedAt,
        answers: questions.map((question) => {
          const answer = answers[question.id] ?? {};
          return {
            questionId: question.id,
            selectedOptionId: answer.selectedOptionId ?? null,
            answerText: answer.answerText?.trim() || null,
          };
        }),
      }),
    onSuccess: (result) => {
      window.localStorage.removeItem(storageKey);
      toast.success("Đã nộp bài.");
      router.push(`/exercise-attempts/${result.attemptId}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (!timedMode || !totalSeconds) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [timedMode, totalSeconds]);

  useEffect(() => {
    if (remainingSeconds !== 0 || !timedMode || !questions.length || mutation.isPending || autoSubmittedRef.current) {
      return;
    }
    autoSubmittedRef.current = true;
    toast.info("Hết giờ, hệ thống đang nộp bài.");
    mutation.mutate();
  }, [mutation, questions.length, remainingSeconds, timedMode]);

  function chooseOption(questionId: number, optionId: number) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...current[questionId], selectedOptionId: optionId },
    }));
  }

  function writeAnswer(questionId: number, value: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...current[questionId], answerText: value },
    }));
  }

  function clearProgress() {
    setAnswers({});
    window.localStorage.removeItem(storageKey);
    toast.success("Đã xóa câu trả lời tạm.");
  }

  function requestSubmit() {
    setConfirmOpen(true);
  }

  function confirmSubmit() {
    setConfirmOpen(false);
    mutation.mutate();
  }

  function changeQuestionPage(page: number) {
    setQuestionPage(page);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  return (
    <AppShell>
      <PageContainer>
        {query.isLoading ? <LoadingSkeleton /> : query.isError || !exercise || !meta ? <ErrorState onRetry={() => query.refetch()} /> : (
          <>
            <PageHeader
              title={exercise.title}
              description={exercise.description || `${questions.length} câu hỏi. Đáp án đúng chỉ hiển thị sau khi nộp bài.`}
              breadcrumbs={[{ label: "Bài tập", href: `/hsk/${exercise.level_hsk.id}/exercises` }, { label: exercise.title }]}
              action={(
                <div className="flex flex-wrap gap-2">
                  <Button onClick={clearProgress} type="button" variant="outline">Làm lại</Button>
                  <Button disabled={mutation.isPending || !questions.length} onClick={requestSubmit} type="button">Nộp bài</Button>
                </div>
              )}
            />

            <section className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="learning-card flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-lg bg-[var(--primary-soft)] text-primary"><ModeIcon className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold">{meta.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <div className="learning-card flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><ListChecks className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold">{answeredCount}/{questions.length} câu đã làm</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Câu chưa trả lời vẫn được tính vào tổng điểm khi nộp.</p>
                </div>
              </div>
              <div className="learning-card flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><Clock3 className="size-5" /></span>
                <div>
                  <p className={cn("text-sm font-semibold", remainingSeconds !== null && remainingSeconds < 300 && "text-primary")}>
                    {remainingSeconds === null ? "Không giới hạn thời gian" : formatTime(remainingSeconds)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{timedMode ? "Hết giờ hệ thống sẽ tự nộp bài." : "Bạn có thể quay lại làm tiếp sau."}</p>
                </div>
              </div>
            </section>

            <QuestionPageControls
              currentPage={currentQuestionPage}
              onPageChange={changeQuestionPage}
              pageSize={QUESTIONS_PER_PAGE}
              questions={questions}
              totalPages={totalQuestionPages}
            />

            {visibleSectionViews.length ? (
              <div className="grid gap-8">
                {visibleSectionViews.map((section) => (
                  <ExerciseSectionBlock
                    answers={answers}
                    key={section.id}
                    onChooseOption={chooseOption}
                    onWriteAnswer={writeAnswer}
                    section={section}
                  />
                ))}
              </div>
            ) : (
              <QuestionList answers={answers} onChooseOption={chooseOption} onWriteAnswer={writeAnswer} questions={visibleQuestions} />
            )}

            <QuestionPageControls
              className="mt-6"
              currentPage={currentQuestionPage}
              onPageChange={changeQuestionPage}
              pageSize={QUESTIONS_PER_PAGE}
              questions={questions}
              totalPages={totalQuestionPages}
            />

            <div className="sticky bottom-20 mt-6 flex items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm lg:bottom-4">
              <span className="text-sm text-muted-foreground">Đã làm {answeredCount}/{questions.length}</span>
              <Button disabled={mutation.isPending || !questions.length} onClick={requestSubmit} type="button">
                {mutation.isPending ? "Đang nộp..." : "Nộp bài"}
              </Button>
            </div>

            <SubmitConfirmDialog
              answeredCount={answeredCount}
              loading={mutation.isPending}
              onCancel={() => setConfirmOpen(false)}
              onConfirm={confirmSubmit}
              open={confirmOpen}
              totalCount={questions.length}
              unansweredCount={unansweredCount}
            />
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}

function QuestionPageControls({
  className,
  currentPage,
  onPageChange,
  pageSize,
  questions,
  totalPages,
}: {
  className?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  questions: Question[];
  totalPages: number;
}) {
  if (!questions.length) {
    return null;
  }

  return (
    <nav className={cn("mb-5 rounded-lg border border-border bg-white p-3", className)} aria-label="Phân trang câu hỏi">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">Trang câu hỏi {currentPage}/{totalPages}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hiển thị câu {questions[(currentPage - 1) * pageSize]?.order_number} - {questions[Math.min(currentPage * pageSize, questions.length) - 1]?.order_number}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} type="button" variant="outline">Trước</Button>
          <Button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} type="button" variant="outline">Sau</Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const firstQuestion = questions[index * pageSize]?.order_number;
          const lastQuestion = questions[Math.min((index + 1) * pageSize, questions.length) - 1]?.order_number;
          const active = page === currentPage;
          return (
            <button
              className={cn(
                "h-8 rounded-lg border border-border px-3 text-xs font-medium transition hover:border-primary/60",
                active && "border-primary bg-[var(--primary-soft)] text-primary",
              )}
              key={page}
              onClick={() => onPageChange(page)}
              type="button"
            >
              {firstQuestion}-{lastQuestion}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SubmitConfirmDialog({
  answeredCount,
  loading,
  onCancel,
  onConfirm,
  open,
  totalCount,
  unansweredCount,
}: {
  answeredCount: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  totalCount: number;
  unansweredCount: number;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
      <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold">Bạn có chắc muốn nộp bài?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Bạn đã trả lời {answeredCount}/{totalCount} câu. {unansweredCount > 0 ? `${unansweredCount} câu chưa trả lời sẽ được tính là sai.` : "Tất cả câu hỏi đã có câu trả lời."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={loading} onClick={onCancel} type="button" variant="outline">Xem lại</Button>
          <Button disabled={loading} onClick={onConfirm} type="button">{loading ? "Đang nộp..." : "Chắc chắn nộp"}</Button>
        </div>
      </section>
    </div>
  );
}

function ExerciseSectionBlock({
  answers,
  onChooseOption,
  onWriteAnswer,
  section,
}: {
  answers: Answers;
  onChooseOption: (questionId: number, optionId: number) => void;
  onWriteAnswer: (questionId: number, value: string) => void;
  section: SectionView;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-primary">{section.section_type}</p>
          <h2 className="mt-1 text-xl font-semibold">{section.title}</h2>
          {section.instruction ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.instruction}</p> : null}
        </div>
        {section.audio_url ? (
          <div className="w-full max-w-xl md:min-w-[28rem]">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Headphones className="size-4" />
              <span>Audio phần thi</span>
            </div>
            <AudioPlayer label="Audio tổng" url={section.audio_url} />
          </div>
        ) : null}
      </div>

      {section.groups.map((group) => (
        <QuestionGroupBlock answers={answers} group={group} key={group.id} onChooseOption={onChooseOption} onWriteAnswer={onWriteAnswer} />
      ))}

      {section.ungroupedQuestions.length ? (
        <QuestionList answers={answers} onChooseOption={onChooseOption} onWriteAnswer={onWriteAnswer} questions={section.ungroupedQuestions} />
      ) : null}
    </section>
  );
}

function QuestionGroupBlock({
  answers,
  group,
  onChooseOption,
  onWriteAnswer,
}: {
  answers: Answers;
  group: GroupView;
  onChooseOption: (questionId: number, optionId: number) => void;
  onWriteAnswer: (questionId: number, value: string) => void;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {group.title ? <h3 className="font-semibold">{group.title}</h3> : null}
          {group.instruction ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{group.instruction}</p> : null}
        </div>
        {/* {group.audio_url ? <AudioButton label="Nghe audio nhóm câu" url={group.audio_url} /> : null} */}
      </div>
      {group.passage_text ? <p className="rounded-lg bg-muted p-4 font-chinese text-sm leading-7">{group.passage_text}</p> : null}
      {group.image_url ? <img alt={group.title || "Question group"} className="max-h-80 rounded-lg object-contain" src={group.image_url} /> : null}
      <QuestionList answers={answers} onChooseOption={onChooseOption} onWriteAnswer={onWriteAnswer} questions={group.questions} />
    </section>
  );
}

function QuestionList({
  answers,
  onChooseOption,
  onWriteAnswer,
  questions,
}: {
  answers: Answers;
  onChooseOption: (questionId: number, optionId: number) => void;
  onWriteAnswer: (questionId: number, value: string) => void;
  questions: Question[];
}) {
  return (
    <div className="grid gap-4">
      {questions.map((question) => (
        <QuestionCard
          answer={answers[question.id]}
          key={question.id}
          onChooseOption={onChooseOption}
          onWriteAnswer={onWriteAnswer}
          question={question}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  answer,
  onChooseOption,
  onWriteAnswer,
  question,
}: {
  answer?: AnswerDraft;
  onChooseOption: (questionId: number, optionId: number) => void;
  onWriteAnswer: (questionId: number, value: string) => void;
  question: Question;
}) {
  const optionQuestion = isOptionQuestion(question);

  return (
    <article className="learning-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Câu {question.order_number}</p>
          <h3 className="mt-2 whitespace-pre-line font-chinese text-xl font-semibold leading-8">{question.question_text}</h3>
          {question.question_pinyin ? <p className="mt-2 text-sm text-muted-foreground">{question.question_pinyin}</p> : null}
        </div>
        <AudioButton text={question.question_text} url={question.audio_url} />
      </div>

      {question.image_url ? <img alt={`Câu ${question.order_number}`} className="mt-4 max-h-80 rounded-lg object-contain" src={question.image_url} /> : null}

      {question.question_type === "REORDER_SENTENCE" && question.options.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {question.options.map((option) => (
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm" key={option.id}>
              <span className="font-semibold">{String.fromCharCode(64 + option.order_number)}.</span> {option.option_text}
            </div>
          ))}
        </div>
      ) : null}

      {optionQuestion ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {question.options.map((option) => {
            const selected = answer?.selectedOptionId === option.id;
            return (
              <div
                className={cn("flex min-h-12 items-center gap-2 rounded-lg border border-border bg-white transition hover:border-primary/60", selected && "border-primary bg-[var(--primary-soft)] text-primary")}
                key={option.id}
              >
                <button
                  className="flex min-h-12 flex-1 items-center gap-3 px-4 py-3 text-left text-sm"
                  onClick={() => onChooseOption(question.id, option.id)}
                  type="button"
                >
                  {selected ? <CheckCircle2 className="size-4" /> : <span className="size-4 rounded-full border" />}
                  <span>{option.option_text || "Lựa chọn bằng hình ảnh"}</span>
                </button>
                {option.image_url ? <img alt={option.option_text || "Option"} className="mr-2 size-16 rounded object-cover" src={option.image_url} /> : null}
                {option.option_text || option.audio_url ? (
                  <AudioButton className="mr-3" text={option.option_text} url={option.audio_url} />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <label className="text-sm font-medium" htmlFor={`answer-${question.id}`}>Câu trả lời</label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            id={`answer-${question.id}`}
            onChange={(event) => onWriteAnswer(question.id, event.target.value)}
            placeholder={question.question_type === "REORDER_SENTENCE" ? "Nhập thứ tự hoặc câu hoàn chỉnh..." : "Nhập câu trả lời của bạn..."}
            value={answer?.answerText ?? ""}
          />
        </div>
      )}
    </article>
  );
}
