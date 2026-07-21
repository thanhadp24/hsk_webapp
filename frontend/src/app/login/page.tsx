"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { InlineLoading } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { authApi, getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

const schema = z.object({
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const { register, handleSubmit } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.login(values.email, values.password),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
      toast.success("Đăng nhập thành công.");
      router.push("/dashboard");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function onSubmit(values: FormValues) {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as Partial<Record<keyof FormValues, string>>);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <form className="learning-card w-full max-w-md p-6" onSubmit={handleSubmit(onSubmit)}>
        <Link className="mb-8 flex items-center gap-2 font-semibold" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-white">汉</span>
          HSK Learning
        </Link>
        <h1 className="page-title">Đăng nhập</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tiếp tục lộ trình học tiếng Trung của bạn.</p>
        <label className="mt-6 block text-sm font-medium">
          Email
          <input className="mt-2 h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" {...register("email")} />
          {errors.email ? <span className="mt-1 block text-xs text-[var(--danger)]">{errors.email}</span> : null}
        </label>
        <label className="mt-4 block text-sm font-medium">
          Mật khẩu
          <input className="mt-2 h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" type="password" {...register("password")} />
          {errors.password ? <span className="mt-1 block text-xs text-[var(--danger)]">{errors.password}</span> : null}
        </label>
        <Button className="mt-6 h-11 w-full" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? <InlineLoading /> : "Đăng nhập"}
        </Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Chưa có tài khoản? <Link className="font-medium text-primary" href="/register">Đăng ký</Link>
        </p>
      </form>
    </main>
  );
}
