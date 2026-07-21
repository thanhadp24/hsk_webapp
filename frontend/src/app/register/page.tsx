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

const schema = z.object({
  full_name: z.string().min(2, "Vui lòng nhập họ tên."),
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự."),
  confirm_password: z.string().min(8, "Vui lòng xác nhận mật khẩu."),
}).refine((data) => data.password === data.confirm_password, {
  message: "Mật khẩu xác nhận không khớp.",
  path: ["confirm_password"],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const { register, handleSubmit } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.register(values.full_name, values.email, values.password),
    onSuccess: () => {
      toast.success("Đăng ký thành công. Hãy đăng nhập.");
      router.push("/login");
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
        <h1 className="page-title">Đăng ký</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tạo tài khoản để lưu tiến độ và từ vựng.</p>
        {(["full_name", "email", "password", "confirm_password"] as const).map((field) => (
          <label className="mt-4 block text-sm font-medium" key={field}>
            {field === "full_name" ? "Họ tên" : field === "confirm_password" ? "Xác nhận mật khẩu" : field === "password" ? "Mật khẩu" : "Email"}
            <input className="mt-2 h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" type={field.includes("password") ? "password" : "text"} {...register(field)} />
            {errors[field] ? <span className="mt-1 block text-xs text-[var(--danger)]">{errors[field]}</span> : null}
          </label>
        ))}
        <Button className="mt-6 h-11 w-full" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? <InlineLoading /> : "Đăng ký"}
        </Button>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Đã có tài khoản? <Link className="font-medium text-primary" href="/login">Đăng nhập</Link>
        </p>
      </form>
    </main>
  );
}
