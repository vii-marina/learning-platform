import { supabaseAdmin } from "../lib/supabase";

export async function getContentForAI({
  afterLessonId,
  moduleId,
}: {
  afterLessonId?: string;
  moduleId?: string;
}): Promise<{ text: string; questionCount: number }> {
  // 👉 Випадок: тест після уроку
  if (afterLessonId) {
    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .select("content")
      .eq("lesson_id", afterLessonId)
      .order("order", { ascending: true });

    if (error || !data) {
      throw new Error("Lesson blocks not found");
    }

    const combinedText = data
      .map((block: any) => {
        try {
          const parsed =
            typeof block.content === "string"
              ? JSON.parse(block.content)
              : block.content;

          const html = parsed?.html || "";

          // 👉 очищаємо HTML → текст
          const cleanText = html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          return cleanText;
        } catch {
          return "";
        }
      })
      .join("\n\n");

    console.log("AI TEXT:", combinedText);

    return {
      text: combinedText,
      questionCount: 5,
    };
  }

  // 👉 Випадок: тест після модуля
  if (moduleId) {
    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .select("content, lesson_id")
      .eq("module_id", moduleId)
      .order("order", { ascending: true });

    if (error || !data) {
      throw new Error("Module lessons not found");
    }

    const combinedText = data
      .map((block: any) => {
        try {
          const parsed =
            typeof block.content === "string"
              ? JSON.parse(block.content)
              : block.content;

          const html = parsed?.html || "";

          const cleanText = html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          return cleanText;
        } catch {
          return "";
        }
      })
      .join("\n\n");

    console.log("AI MODULE TEXT:", combinedText);

    return {
      text: combinedText,
      questionCount: 15,
    };
  }

  throw new Error("No lessonId or moduleId provided");
}