"use client";

import { BookOpen, Dumbbell, ImageIcon, Layers3, LibraryBig } from "lucide-react";
import Link from "next/link";

import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const features = [
  { title: "Từ vựng", text: "Học theo chủ đề, có pinyin và ví dụ.", icon: BookOpen },
  { title: "Flashcard", text: "Ôn nhanh trực tiếp từ kho từ vựng.", icon: Layers3 },
  { title: "Ngữ pháp", text: "Đọc cấu trúc, giải thích và câu mẫu.", icon: LibraryBig },
  { title: "Hình ảnh", text: "Ghi nhớ từ qua bộ ảnh học tập.", icon: ImageIcon },
  { title: "Bài tập", text: "Làm trắc nghiệm và xem kết quả thật.", icon: Dumbbell },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <AppLogo />
        <div className="flex gap-2">
          <Link href={user ? "/dashboard" : "/login"}>
            <Button variant="outline">{user ? "Vào học" : "Đăng nhập"}</Button>
          </Link>
          <Link href="/register">
            <Button>Bắt đầu học</Button>
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.08fr_0.92fr] md:px-6 md:py-20">
        <div className="self-center">
          <p className="mb-3 text-sm font-semibold text-primary">Tự học tiếng Trung cho người Việt</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground md:text-6xl">
            Học HSK nhẹ nhàng, rõ lộ trình, dữ liệu từ API thật.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            Chọn cấp độ HSK, học từ vựng theo chủ đề, đọc ngữ pháp, ôn flashcard và làm bài tập trong một giao diện sáng, gọn, dễ tập trung.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? "/dashboard" : "/register"}>
              <Button className="h-11 px-5">Bắt đầu học</Button>
            </Link>
            <Link href="/login">
              <Button className="h-11 px-5" variant="outline">Đăng nhập</Button>
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="learning-card p-5" key={feature.title}>
                <Icon className="mb-4 size-6 text-primary" />
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
