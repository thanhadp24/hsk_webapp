export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type HskLevel = {
  id: number;
  name: string;
  description: string;
  order_number: number;
  status: boolean;
};

export type Topic = {
  id: number;
  name: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  order_number: number;
  status: boolean;
  vocabulary_count?: number;
  grammar_count?: number;
  exercise_count?: number;
};


export type User = {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string;
  current_hsk_level: HskLevel | null;
  status: "ACTIVE" | "LOCKED";
};

export type VocabularyExample = {
  id: number;
  sentence_chinese: string;
  pinyin: string;
  meaning_vi: string;
  audio_url: string | null;
  order_number: number;
};

export type Vocabulary = {
  id: number;
  level_hsk: HskLevel;
  topic: Topic | null;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  meaning_vi: string;
  han_viet: string | null;
  word_type: string;
  audio_url: string | null;
  image_url: string | null;
  note: string | null;
  order_number: number;
  is_saved: boolean;
  previous_id?: number | null;
  next_id?: number | null;
  examples?: VocabularyExample[];
};

export type GrammarExample = {
  id: number;
  sentence_chinese: string;
  pinyin: string;
  meaning_vi: string;
  explanation: string | null;
  audio_url: string | null;
  order_number: number;
};

export type GrammarPoint = {
  id: number;
  level_hsk: HskLevel;
  topic: Topic | null;
  title: string;
  structure: string;
  meaning_vi: string;
  explanation: string;
  note: string | null;
  image_url: string | null;
  order_number: number;
  previous_id?: number | null;
  next_id?: number | null;
  examples?: GrammarExample[];
};

export type VisualLearningImage = {
  id: number;
  level_hsk: HskLevel;
  image_url: string;
  order_number: number;
};

export type QuestionOption = {
  id: number;
  option_text: string | null;
  image_url: string | null;
  audio_url: string | null;
  order_number: number;
};

export type Question = {
  id: number;
  section_id?: number | null;
  question_group_id?: number | null;
  question_type?: string | null;
  question_text: string;
  question_pinyin: string | null;
  image_url: string | null;
  audio_url: string | null;
  score: string;
  start_time_seconds?: string | null;
  end_time_seconds?: string | null;
  order_number: number;
  options: QuestionOption[];
};

export type QuestionGroup = {
  id: number;
  section_id: number | null;
  title: string | null;
  instruction: string | null;
  passage_text: string | null;
  passage_pinyin: string | null;
  audio_url: string | null;
  image_url: string | null;
  start_time_seconds: string | null;
  end_time_seconds: string | null;
  order_number: number;
};

export type ExerciseSection = {
  id: number;
  section_type: string | null;
  title: string;
  instruction: string | null;
  audio_url: string | null;
  time_limit_minutes: number | null;
  max_score: string | null;
  order_number: number;
  question_groups?: QuestionGroup[];
};

export type ExerciseSet = {
  id: number;
  level_hsk: HskLevel;
  topic: Topic | null;
  title: string;
  description: string | null;
  content_type: string;
  exercise_mode: string;
  time_limit_minutes: number | null;
  passing_score: string;
  order_number: number;
  question_count: number;
  sections?: ExerciseSection[];
  question_groups?: QuestionGroup[];
  questions?: Question[];
};

export type SubmitExerciseResult = {
  attemptId: number;
  score: string;
  totalScore: string;
  correctCount: number;
  wrongCount: number;
  passed: boolean;
  submittedAt: string;
};

export type AttemptAnswer = {
  question_id: number;
  question_text: string;
  selected_option: Pick<QuestionOption, "id" | "option_text" | "image_url" | "audio_url"> | null;
  answer_text: string | null;
  answer_payload: unknown;
  correct_option: Pick<QuestionOption, "id" | "option_text" | "image_url" | "audio_url"> | null;
  is_correct: boolean;
  earned_score: string;
  explanation: string | null;
};

export type ExerciseAttempt = {
  id: number;
  exercise_set: ExerciseSet;
  score: string;
  total_score: string;
  correct_count: number;
  wrong_count: number;
  passed: boolean;
  started_at: string | null;
  submitted_at: string;
  duration_seconds: number | null;
  answers?: AttemptAnswer[];
};

export type QueryParams = Record<string, string | number | boolean | null | undefined>;
