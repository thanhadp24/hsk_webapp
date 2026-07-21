import {
  BookOpen,
  Dumbbell,
  Heart,
  History,
  Home,
  Image,
  Layers3,
  LibraryBig,
  SquareUser,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  needsLevel?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Trang chủ", icon: Home },
  { href: "/hsk", label: "Cấp độ HSK", icon: Trophy },
  { href: "/learn/vocabulary", label: "Từ vựng", icon: BookOpen, needsLevel: true },
  { href: "/learn/grammar", label: "Ngữ pháp", icon: LibraryBig, needsLevel: true },
  { href: "/learn/flashcards", label: "Flashcard", icon: Layers3, needsLevel: true },
  { href: "/learn/visual-learning", label: "Học qua ảnh", icon: Image, needsLevel: true },
  { href: "/learn/exercises", label: "Bài tập", icon: Dumbbell, needsLevel: true },
  { href: "/saved-vocabularies", label: "Đã lưu", icon: Heart },
  { href: "/exercise-history", label: "Lịch sử", icon: History },
  { href: "/profile", label: "Tài khoản", icon: SquareUser },
] as const;
