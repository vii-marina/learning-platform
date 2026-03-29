import { supabaseAdmin } from "../lib/supabase";

function extractPlainText(content: unknown) {
  try {
    const parsed =
      typeof content === "string"
        ? JSON.parse(content)
        : content;

    const html = typeof parsed === "object" && parsed !== null ? parsed.html : "";

    if (typeof html !== "string") {
      return "";
    }

    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getMaxQuestionCount(text: string, hardLimit: number) {
  const wordCount = countWords(text);

  if (wordCount === 0) {
    return 0;
  }

  if (wordCount <= 10) {
    return 1;
  }

  if (wordCount <= 40) {
    return Math.min(hardLimit, 2);
  }

  if (wordCount <= 90) {
    return Math.min(hardLimit, 3);
  }

  if (wordCount <= 160) {
    return Math.min(hardLimit, 5);
  }

  if (wordCount <= 280) {
    return Math.min(hardLimit, 8);
  }

  if (wordCount <= 450) {
    return Math.min(hardLimit, 10);
  }

  return hardLimit;
}

function resolveQuestionCount(
  requestedQuestionCount: number | undefined,
  maxQuestionCount: number,
  fallbackQuestionCount: number
) {
  if (maxQuestionCount <= 0) {
    return 0;
  }

  const normalizedRequestedQuestionCount =
    typeof requestedQuestionCount === "number" && Number.isFinite(requestedQuestionCount)
      ? Math.floor(requestedQuestionCount)
      : fallbackQuestionCount;

  return Math.max(1, Math.min(normalizedRequestedQuestionCount, maxQuestionCount));
}

export async function getContentForAI({
  afterLessonId,
  moduleId,
  questionCount,
}: {
  afterLessonId?: string;
  moduleId?: string;
  questionCount?: number;
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
      .map((block: { content: unknown }) => extractPlainText(block.content))
      .filter(Boolean)
      .join("\n\n");
    const maxQuestionCount = getMaxQuestionCount(combinedText, 5);

    return {
      text: combinedText,
      questionCount: resolveQuestionCount(questionCount, maxQuestionCount, 5),
    };
  }

  // 👉 Випадок: тест після модуля
  if (moduleId) {
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("id, order")
      .eq("module_id", moduleId)
      .order("order", { ascending: true });

    if (lessonsError || !lessons) {
      throw new Error("Module lessons not found");
    }

    if (lessons.length === 0) {
      return {
        text: "",
        questionCount: 0,
      };
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from("lesson_blocks")
      .select("lesson_id, content, order")
      .in("lesson_id", lessonIds)
      .order("order", { ascending: true });

    if (blocksError || !blocks) {
      throw new Error("Module lessons not found");
    }

    const blocksByLessonId = new Map<string, Array<{ content: unknown }>>();
    blocks.forEach((block) => {
      const currentBlocks = blocksByLessonId.get(block.lesson_id) ?? [];
      currentBlocks.push({ content: block.content });
      blocksByLessonId.set(block.lesson_id, currentBlocks);
    });

    const combinedText = lessons
      .map((lesson) =>
        (blocksByLessonId.get(lesson.id) ?? [])
          .map((block) => extractPlainText(block.content))
          .filter(Boolean)
          .join("\n\n")
      )
      .filter(Boolean)
      .join("\n\n");
    const maxQuestionCount = getMaxQuestionCount(combinedText, 15);

    return {
      text: combinedText,
      questionCount: resolveQuestionCount(questionCount, maxQuestionCount, 15),
    };
  }

  throw new Error("No lessonId or moduleId provided");
}
