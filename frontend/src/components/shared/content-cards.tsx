"use client";

import { ArrowRight, BookOpen, CheckCircle2, FileText, ImageIcon, Layers3, Maximize2 } from "lucide-react";
import Link from "next/link";

import { AudioButton } from "@/components/shared/audio-button";
import { SaveVocabularyButton } from "@/components/shared/save-vocabulary-button";
import { Button } from "@/components/ui/button";
import { formatScorePair } from "@/lib/format";
import type { ExerciseAttempt, ExerciseSet, GrammarPoint, HskLevel, Topic, VisualLearningImage, Vocabulary } from "@/types/api";

const exerciseModeLabels: Record<string, string> = {
  PRACTICE: "Luyện tập",
  TEST: "Kiểm tra",
  MOCK_EXAM: "Thi thử",
};

const exerciseContentTypeLabels: Record<string, string> = {
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  MIXED: "Tổng hợp",
  EXAM: "Đề thi",
  VISUAL_LEARNING: "Hình ảnh",
};

export function HskCard({ level, current, onChoose }: { level: HskLevel; current?: boolean; onChoose?: () => void }) {
  return (
    <article className="learning-card flex h-full flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold">{level.name}</h3>
          {current ? <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary">Đang học</span> : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{level.description || "Lo trinh tu hoc theo cap do HSK."}</p>
      </div>
      <Button className="mt-5 w-full" onClick={onChoose} type="button" variant={current ? "outline" : "default"}>
        {current ? "Tiếp tục học" : "Chọn cấp độ"}
      </Button>
    </article>
  );
}

export function ModuleCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: "vocabulary" | "grammar" | "flashcard" | "visual" | "exercise" }) {
  const Icon = {
    vocabulary: BookOpen,
    grammar: FileText,
    flashcard: Layers3,
    visual: ImageIcon,
    exercise: CheckCircle2,
  }[icon];

  return (
    <Link className="learning-card group block p-5 transition hover:border-primary/60 hover:shadow-md" href={href}>
      <Icon className="mb-4 size-6 text-primary" />
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
        Mở module <ArrowRight className="size-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export function TopicCard({ topic, href, count }: { topic: Topic; href: string; count?: number }) {
  return (
    <Link className="learning-card block overflow-hidden transition hover:border-primary/60 hover:shadow-md" href={href}>
      <div className="aspect-[16/8] bg-[var(--primary-soft)]">
        {topic.thumbnail_url ? <img alt={topic.name} className="h-full w-full object-cover" src={topic.thumbnail_url} /> : null}
      </div>
      <div className="p-5">
        <h3 className="font-semibold">{topic.name}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{topic.description || "Học nội dung theo chủ đề này."}</p>
        {typeof count === "number" ? <p className="mt-4 text-xs font-medium text-primary">{count} mục học</p> : null}
      </div>
    </Link>
  );
}

export function VocabularyCard({ vocabulary }: { vocabulary: Vocabulary }) {
  return (
    <article className="learning-card grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link className="font-chinese text-3xl font-semibold hover:text-primary" href={`/vocabularies/${vocabulary.id}`}>
            {vocabulary.simplified}
          </Link>
          {vocabulary.traditional && vocabulary.traditional !== vocabulary.simplified ? <span className="font-chinese text-xl text-muted-foreground">{vocabulary.traditional}</span> : null}
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{vocabulary.word_type}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{vocabulary.pinyin}</p>
        <p className="mt-2 font-medium">{vocabulary.meaning_vi}</p>
        {vocabulary.han_viet ? <p className="mt-1 text-sm text-muted-foreground">Hán Việt: {vocabulary.han_viet}</p> : null}
      </div>
      <div className="flex items-center gap-2 sm:flex-col">
        <AudioButton text={vocabulary.simplified} url={vocabulary.audio_url} />
        <SaveVocabularyButton isSaved={vocabulary.is_saved} vocabularyId={vocabulary.id} />
        <Link href={`/vocabularies/${vocabulary.id}`}>
          <Button size="icon" type="button" variant="outline">
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </article>
  );
}

export function GrammarCard({ grammar }: { grammar: GrammarPoint }) {
  return (
    <article className="learning-card p-5 transition hover:border-primary/60 hover:shadow-md">
      <Link className="block" href={`/grammar-points/${grammar.id}`}>
        <p className="text-xs font-medium text-primary">{grammar.topic?.name || grammar.level_hsk.name}</p>
        <h3 className="mt-2 font-semibold">{grammar.title}</h3>
        <p className="mt-3 rounded-xl bg-muted p-3 font-chinese text-sm leading-6">{grammar.structure}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{grammar.meaning_vi}</p>
      </Link>
      <div className="mt-4 flex justify-end">
        <AudioButton text={grammar.structure} />
      </div>
    </article>
  );
}

export function VisualCard({ image, onOpen }: { image: VisualLearningImage; onOpen?: () => void }) {
  const label = `Ảnh học tập ${String(image.order_number).padStart(3, "0")}`;

  return (
    <button
      className="learning-card group block w-full overflow-hidden text-left transition hover:border-primary/60 hover:shadow-md"
      onClick={onOpen}
      type="button"
    >
      <div className="relative aspect-[4/3] bg-muted">
        <img alt={label} className="h-full w-full object-cover" loading="lazy" src={image.image_url} />
        <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-white/90 text-primary opacity-0 shadow-sm transition group-hover:opacity-100">
          <Maximize2 className="size-4" />
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{label}</h3>
      </div>
    </button>
  );
}

export function ExerciseCard({ exercise }: { exercise: ExerciseSet }) {
  const modeLabel = exerciseModeLabels[exercise.exercise_mode] ?? exercise.exercise_mode;
  const contentTypeLabel = exerciseContentTypeLabels[exercise.content_type] ?? exercise.content_type;

  return (
    <Link className="learning-card block p-5 transition hover:border-primary/60 hover:shadow-md" href={`/exercises/${exercise.id}`}>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-primary">{modeLabel}</span>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{contentTypeLabel}</span>
      </div>
      <h3 className="mt-2 font-semibold">{exercise.title}</h3>
      {exercise.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{exercise.description}</p> : null}
      <p className="mt-4 text-sm text-muted-foreground">{exercise.question_count} câu hỏi · Đạt {exercise.passing_score}%</p>
    </Link>
  );
}

export function AttemptCard({ attempt }: { attempt: ExerciseAttempt }) {
  return (
    <Link className="learning-card flex items-center justify-between gap-4 p-5" href={`/exercise-attempts/${attempt.id}`}>
      <div>
        <h3 className="font-semibold">{attempt.exercise_set.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{new Date(attempt.submitted_at).toLocaleString("vi-VN")}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-primary">{formatScorePair(attempt.score, attempt.total_score)}</p>
        <p className="text-xs text-muted-foreground">{attempt.passed ? "Đạt" : "Chưa đạt"}</p>
      </div>
    </Link>
  );
}
