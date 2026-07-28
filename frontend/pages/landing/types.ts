import type { LucideIcon } from "lucide-react";

export type IconComponent = LucideIcon;

export type PreviewMode = "lesson" | "test" | "exercise";

export type LandingPreviewLesson = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  order: number;
};

export type LandingPreviewModule = {
  id: string;
  course_id: string;
  title: string;
  order: number;
};

export type LandingPreviewAnswer = {
  id: string;
  answer_text: string;
  is_correct: boolean;
};

export type LandingPreviewQuestion = {
  id: string;
  type: "true_false" | "single_choice" | "multiple_choice";
  question_text: string;
  order: number;
  answers: LandingPreviewAnswer[];
};

export type LandingPreviewTest = {
  id: string;
  title: string;
  after_lesson_id: string | null;
  module_id: string;
  questions: LandingPreviewQuestion[];
};

export type LandingPreviewExercise = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: "drag_drop_code" | "write_code";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
};

export type PublicLandingPreview = {
  course: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    thumbnail_path: string | null;
  };
  module: LandingPreviewModule;
  lesson: LandingPreviewLesson;
  module_lessons: LandingPreviewLesson[];
  test: LandingPreviewTest | null;
  exercise: LandingPreviewExercise | null;
};

export type LandingPreviewStatus = "loading" | "ready" | "error";
