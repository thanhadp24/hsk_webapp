"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { authApi, catalogApi, getErrorMessage } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const levelsQuery = useQuery({ queryKey: ["hsk-levels"], queryFn: catalogApi.levels });

  const mutation = useMutation({
    mutationFn: (payload: { full_name: string; current_hsk_level_id: number | null }) => authApi.updateMe(payload),
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Đã cập nhật tài khoản.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader title="Tài khoản" description="Quản lý thông tin cá nhân và cấp độ đang học." />
        {!user ? <ErrorState /> : levelsQuery.isLoading ? <LoadingSkeleton lines={2} /> : levelsQuery.isError ? <ErrorState onRetry={() => levelsQuery.refetch()} /> : (
          <form
            className="learning-card max-w-2xl p-6"
            key={`${user.id}-${user.current_hsk_level?.id ?? "none"}`}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const rawLevelId = formData.get("current_hsk_level_id")?.toString() ?? "";
              mutation.mutate({
                full_name: formData.get("full_name")?.toString() ?? "",
                current_hsk_level_id: rawLevelId ? Number(rawLevelId) : null,
              });
            }}
          >
            <label className="block text-sm font-medium">
              Họ tên
              <input className="mt-2 h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" defaultValue={user.full_name} name="full_name" />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Email
              <input className="mt-2 h-11 w-full rounded-xl border border-border bg-muted px-3 text-muted-foreground" disabled value={user.email} />
            </label>
            <label className="mt-4 block text-sm font-medium">
              HSK đang học
              <select className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" defaultValue={user.current_hsk_level?.id ?? ""} name="current_hsk_level_id">
                <option value="">Chưa chọn</option>
                {levelsQuery.data?.results.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
              </select>
            </label>
            <Button className="mt-6 h-11" disabled={mutation.isPending} type="submit">Lưu thay đổi</Button>
          </form>
        )}
      </PageContainer>
    </AppShell>
  );
}
