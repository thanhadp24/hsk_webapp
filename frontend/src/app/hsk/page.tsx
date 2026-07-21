"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { HskCard } from "@/components/shared/content-cards";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { authApi, catalogApi, getErrorMessage } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";

export default function HskPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const levelsQuery = useQuery({ queryKey: ["hsk-levels"], queryFn: catalogApi.levels });
  const mutation = useMutation({
    mutationFn: (levelId: number) => authApi.updateMe({ current_hsk_level_id: levelId }),
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Đã cập nhật cấp độ HSK.");
      if (updatedUser.current_hsk_level) {
        router.push(`/hsk/${updatedUser.current_hsk_level.id}`);
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Chọn cấp độ HSK" description="Danh sách cấp độ lấy từ API. Chọn một cấp độ để mở các module học." />
        {levelsQuery.isLoading ? <LoadingSkeleton /> : levelsQuery.isError ? <ErrorState onRetry={() => levelsQuery.refetch()} /> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {levelsQuery.data?.results.map((level) => (
              <HskCard current={user?.current_hsk_level?.id === level.id} key={level.id} level={level} onChoose={() => mutation.mutate(level.id)} />
            ))}
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
