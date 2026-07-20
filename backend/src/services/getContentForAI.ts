import { supabaseAdmin } from "../lib/supabase";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function extractHtml(content: unknown) {
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);

      if (typeof parsed === "string") {
        return parsed;
      }

      if (parsed && typeof parsed === "object" && "html" in parsed) {
        return typeof parsed.html === "string" ? parsed.html : "";
      }
    } catch {
      return content;
    }
  }

  if (content && typeof content === "object" && "html" in content) {
    return typeof content.html === "string" ? content.html : "";
  }

  return "";
}

function extractPlainText(content: unknown) {
  const html = extractHtml(content);

  if (!html) {
    return "";
  }

  return decodeHtmlEntities(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|ul|ol|pre|blockquote)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?code\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function cleanText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function splitIntoSections(text: string) {
  const rawSections = text.split("\n\n");

  const sections = rawSections
    .map((s) => s.trim())
    .filter((s) => s.length > 30);

  const usableSections = sections.length > 0 ? sections : [text.trim()].filter(Boolean);

  return usableSections.map((section, index) => {
    return `SECTION ${index + 1}:\n${section}`;
  });
}

function limitTextLength(sections: string[], maxChars = 6000) {
  const result: string[] = [];
  let total = 0;

  for (const section of sections) {
    if (total + section.length > maxChars) break;

    result.push(section);
    total += section.length;
  }

  return result.join("\n\n");
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function getMaxQuestionCount(wordCount: number, hardLimit: number) {
  if (wordCount <= 20) return 1;
  if (wordCount <= 60) return Math.min(2, hardLimit);
  if (wordCount <= 120) return Math.min(4, hardLimit);
  if (wordCount <= 250) return Math.min(6, hardLimit);
  if (wordCount <= 400) return Math.min(8, hardLimit);
  return hardLimit;
}

function resolveQuestionCount(
  requested: number | undefined,
  max: number,
  fallback: number
) {
  const safeRequested =
    typeof requested === "number" && Number.isFinite(requested)
      ? Math.floor(requested)
      : fallback;

  return Math.max(1, Math.min(safeRequested, max));
}

async function getLessonFallbackText(lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("content")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    throw new Error("Lesson content not found");
  }

  return extractPlainText(data?.content);
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

  // LESSON MODE
  if (afterLessonId) {
    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .select("content")
      .eq("lesson_id", afterLessonId)
      .order("order", { ascending: true });

    if (error || !data) {
      throw new Error("Lesson blocks not found");
    }

    const rawText = data
      .map((b) => extractPlainText(b.content))
      .filter(Boolean)
      .join("\n\n");

    const lessonText = rawText || (await getLessonFallbackText(afterLessonId));

    const cleaned = cleanText(lessonText);
    const sections = splitIntoSections(cleaned);
    const finalText = limitTextLength(sections);

    const wordCount = countWords(finalText);
    const maxQuestions = getMaxQuestionCount(wordCount, 5);

    return {
      text: finalText,
      questionCount: resolveQuestionCount(questionCount, maxQuestions, 5),
    };
  }

  // MODULE MODE
  if (moduleId) {
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("id, content, order")
      .eq("module_id", moduleId)
      .order("order", { ascending: true });

    if (lessonsError || !lessons) {
      throw new Error("Module lessons not found");
    }

    if (lessons.length === 0) {
      return { text: "", questionCount: 0 };
    }

    const lessonIds = lessons.map((l) => l.id);

    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from("lesson_blocks")
      .select("lesson_id, content, order")
      .in("lesson_id", lessonIds)
      .order("order", { ascending: true });

    if (blocksError || !blocks) {
      throw new Error("Module lesson blocks not found");
    }

    const grouped = new Map<string, string[]>();

    for (const block of blocks) {
      const text = extractPlainText(block.content);
      if (!text) continue;

      const arr = grouped.get(block.lesson_id) || [];
      arr.push(text);
      grouped.set(block.lesson_id, arr);
    }

    const combinedText = lessons
      .map((lesson, index) => {
        const blockText = (grouped.get(lesson.id) || []).join("\n\n");
        const lessonText = blockText || extractPlainText(lesson.content);

        return `LESSON ${index + 1}:\n${lessonText}`;
      })
      .join("\n\n");

    const cleaned = cleanText(combinedText);
    const sections = splitIntoSections(cleaned);
    const finalText = limitTextLength(sections, 8000);

    const wordCount = countWords(finalText);
    const maxQuestions = getMaxQuestionCount(wordCount, 15);

    return {
      text: finalText,
      questionCount: resolveQuestionCount(questionCount, maxQuestions, 15),
    };
  }

  throw new Error("No lessonId or moduleId provided");
}
