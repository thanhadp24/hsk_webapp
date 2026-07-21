"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getErrorMessage, vocabularyApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function SaveVocabularyButton({
  vocabularyId,
  isSaved,
}: {
  vocabularyId: number;
  isSaved: boolean;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const mutation = useMutation({
    mutationFn: () => (isSaved ? vocabularyApi.unsave(vocabularyId) : vocabularyApi.save(vocabularyId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-vocabularies"] });
      toast.success(isSaved ? "Đã bỏ lưu từ vựng." : "Đã lưu từ vựng.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <Button
      aria-label={isSaved ? "Bỏ lưu từ vựng" : "Lưu từ vựng"}
      className={cn(isSaved && "border-primary bg-[var(--primary-soft)] text-primary")}
      disabled={mutation.isPending}
      onClick={() => {
        if (!user) {
          toast.error("Bạn cần đăng nhập để lưu từ vựng.");
          return;
        }
        mutation.mutate();
      }}
      size="icon"
      type="button"
      variant="outline"
    >
      <Heart className={cn("size-4", isSaved && "fill-current")} />
    </Button>
  );
}
