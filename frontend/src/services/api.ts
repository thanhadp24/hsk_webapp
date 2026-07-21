import { AxiosError } from "axios";

import { apiClient } from "@/services/api-client";
import type {
  ExerciseAttempt,
  ExerciseSet,
  GrammarPoint,
  HskLevel,
  PaginatedResponse,
  QueryParams,
  SubmitExerciseResult,
  Topic,
  User,
  VisualLearningImage,
  Vocabulary,
} from "@/types/api";

function normalizeParams(params?: QueryParams) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { detail?: string; non_field_errors?: string[] } | undefined;
    return data?.detail ?? data?.non_field_errors?.join(" ") ?? "Không thể kết nối máy chủ.";
  }
  return "Đã có lỗi xảy ra.";
}

export async function getPage<T>(url: string, params?: QueryParams) {
  const response = await apiClient.get<PaginatedResponse<T>>(url, {
    params: normalizeParams(params),
  });
  return response.data;
}

export async function getItem<T>(url: string) {
  const response = await apiClient.get<T>(url);
  return response.data;
}

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiClient.post<{ access: string; refresh: string; user: User }>("/auth/login/", {
      email,
      password,
    });
    return response.data;
  },
  async register(full_name: string, email: string, password: string) {
    const response = await apiClient.post<User>("/auth/register/", { full_name, email, password });
    return response.data;
  },
  async me() {
    return getItem<User>("/users/me/");
  },
  async updateMe(payload: { full_name?: string; avatar_url?: string; current_hsk_level_id?: number | null }) {
    const response = await apiClient.patch<User>("/users/me/", payload);
    return response.data;
  },
};

export const catalogApi = {
  levels: () => getPage<HskLevel>("/hsk-levels/"),
  level: (id: number) => getItem<HskLevel>(`/hsk-levels/${id}/`),
  topics: (params?: QueryParams) => getPage<Topic>("/topics/", params),
};

export const vocabularyApi = {
  list: (params?: QueryParams) => getPage<Vocabulary>("/vocabularies/", params),
  detail: (id: number) => getItem<Vocabulary>(`/vocabularies/${id}/`),
  flashcards: async (params?: QueryParams) => {
    const response = await apiClient.get<Vocabulary[]>("/vocabularies/flashcards/", {
      params: normalizeParams(params),
    });
    return response.data;
  },
  saved: (params?: QueryParams) => getPage<Vocabulary>("/users/me/saved-vocabularies/", params),
  save: (id: number) => apiClient.post(`/vocabularies/${id}/save/`),
  unsave: (id: number) => apiClient.delete(`/vocabularies/${id}/save/`),
};

export const grammarApi = {
  list: (params?: QueryParams) => getPage<GrammarPoint>("/grammar-points/", params),
  detail: (id: number) => getItem<GrammarPoint>(`/grammar-points/${id}/`),
};

export const visualApi = {
  list: (params?: QueryParams) => getPage<VisualLearningImage>("/visual-learning-images/", params),
};

export const exercisesApi = {
  list: (params?: QueryParams) => getPage<ExerciseSet>("/exercise-sets/", params),
  detail: (id: number) => getItem<ExerciseSet>(`/exercise-sets/${id}/`),
  submit: (
    id: number,
    payload: {
      startedAt: string;
      answers: { questionId: number; selectedOptionId?: number | null; answerText?: string | null; answerPayload?: unknown }[];
    },
  ) =>
    apiClient.post<SubmitExerciseResult>(`/exercise-sets/${id}/submit/`, payload).then((response) => response.data),
  attempts: (params?: QueryParams) => getPage<ExerciseAttempt>("/users/me/exercise-attempts/", params),
  attemptDetail: (id: number) => getItem<ExerciseAttempt>(`/exercise-attempts/${id}/`),
};
