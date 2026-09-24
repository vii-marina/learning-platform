import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Bulk course import.
 *
 * Reads one JSON file describing a course and its modules/lessons and creates
 * them through the existing authoring endpoints — no direct database access, so
 * ownership checks, validation and RLS all still apply.
 *
 * The file may hold a single module, so a large course can be imported in parts:
 * the first run creates the course, later runs pass --course-id to append to it.
 */

type LessonInput = {
  order: number;
  title: string;
  content: string;
};

type ModuleInput = {
  order: number;
  title: string;
  lessons: LessonInput[];
};

type CourseFile = {
  course?: {
    title: string;
    description?: string | null;
  };
  modules: ModuleInput[];
};

type CreatedModule = {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
};

type Progress = {
  courseId: string | null;
  courseCreated: boolean;
  modules: CreatedModule[];
};

const REQUEST_BODY_LIMIT_BYTES = 1024 * 1024;
const LESSON_CONTENT_WARN_BYTES = 800 * 1024;

const DISCOURAGED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /<h[1-6][\s>]/i, reason: "заголовки h1-h6 не мають стилів і виглядають як звичайний текст" },
  { pattern: /<table[\s>]/i, reason: "таблиці не підтримуються редактором і будуть втрачені при редагуванні" },
  { pattern: /<blockquote[\s>]/i, reason: "blockquote не має стилів" },
  { pattern: /<script[\s>]/i, reason: "контент вставляється без санітизації — теги script неприпустимі" },
  { pattern: /<style[\s>]/i, reason: "теги style неприпустимі" },
  { pattern: /\sstyle\s*=/i, reason: "інлайнові style не передбачені форматом" },
];

function parseArgs(argv: string[]) {
  let filePath: string | null = null;
  let courseId: string | null = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--course-id") {
      courseId = argv[++i] ?? null;

      if (!courseId) {
        throw new Error("--course-id потребує значення.");
      }

      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Невідомий аргумент: ${arg}`);
    }

    if (filePath) {
      throw new Error("Вкажіть рівно один файл.");
    }

    filePath = arg;
  }

  if (!filePath) {
    throw new Error("Не вказано файл із курсом.");
  }

  return { filePath, courseId, dryRun };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validate(data: unknown, needsCourse: boolean) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { errors: ["Кореневий елемент має бути об'єктом."], warnings };
  }

  const file = data as CourseFile;

  if (needsCourse) {
    if (!file.course || typeof file.course !== "object") {
      errors.push("Відсутній об'єкт course (потрібен, бо курс створюється цим запуском).");
    } else {
      const title = file.course.title;

      if (typeof title !== "string" || title.trim().length === 0) {
        errors.push("course.title обов'язковий і не може бути порожнім.");
      } else if (title.length > 200) {
        errors.push(`course.title довший за 200 символів (${title.length}).`);
      }

      const description = file.course.description;

      if (description !== undefined && description !== null && typeof description !== "string") {
        errors.push("course.description має бути рядком або null.");
      }
    }
  }

  if (!Array.isArray(file.modules) || file.modules.length === 0) {
    errors.push("modules має бути непорожнім масивом.");
    return { errors, warnings };
  }

  const moduleOrders = new Set<number>();

  file.modules.forEach((module, moduleIndex) => {
    const where = `modules[${moduleIndex}]`;

    if (typeof module !== "object" || module === null) {
      errors.push(`${where} має бути об'єктом.`);
      return;
    }

    if (!Number.isInteger(module.order) || module.order < 1) {
      errors.push(`${where}.order має бути цілим числом від 1.`);
    } else if (moduleOrders.has(module.order)) {
      warnings.push(`${where}.order = ${module.order} повторюється в цьому файлі.`);
    } else {
      moduleOrders.add(module.order);
    }

    if (typeof module.title !== "string" || module.title.trim().length === 0) {
      errors.push(`${where}.title обов'язковий.`);
    } else if (module.title.length > 200) {
      errors.push(`${where}.title довший за 200 символів (${module.title.length}).`);
    }

    if (!Array.isArray(module.lessons) || module.lessons.length === 0) {
      errors.push(`${where}.lessons має бути непорожнім масивом.`);
      return;
    }

    const lessonOrders = new Set<number>();

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonWhere = `${where}.lessons[${lessonIndex}]`;

      if (typeof lesson !== "object" || lesson === null) {
        errors.push(`${lessonWhere} має бути об'єктом.`);
        return;
      }

      if (!Number.isInteger(lesson.order) || lesson.order < 1) {
        errors.push(`${lessonWhere}.order має бути цілим числом від 1.`);
      } else if (lessonOrders.has(lesson.order)) {
        warnings.push(`${lessonWhere}.order = ${lesson.order} повторюється в межах модуля.`);
      } else {
        lessonOrders.add(lesson.order);
      }

      if (typeof lesson.title !== "string" || lesson.title.trim().length === 0) {
        errors.push(`${lessonWhere}.title обов'язковий.`);
      } else if (lesson.title.length > 200) {
        errors.push(`${lessonWhere}.title довший за 200 символів (${lesson.title.length}).`);
      }

      if (typeof lesson.content !== "string" || lesson.content.trim().length === 0) {
        errors.push(`${lessonWhere}.content обов'язковий і не може бути порожнім.`);
        return;
      }

      const contentBytes = Buffer.byteLength(lesson.content, "utf8");

      if (contentBytes >= REQUEST_BODY_LIMIT_BYTES) {
        errors.push(
          `${lessonWhere}.content — ${Math.round(contentBytes / 1024)} КБ, це перевищує ліміт запиту в 1 МБ.`
        );
      } else if (contentBytes >= LESSON_CONTENT_WARN_BYTES) {
        warnings.push(
          `${lessonWhere}.content — ${Math.round(contentBytes / 1024)} КБ, близько до ліміту запиту в 1 МБ.`
        );
      }

      DISCOURAGED_PATTERNS.forEach(({ pattern, reason }) => {
        if (pattern.test(lesson.content)) {
          warnings.push(`${lessonWhere}.content: ${reason}.`);
        }
      });
    });
  });

  return { errors, warnings };
}

function printProgress(progress: Progress) {
  console.log("");
  console.log("Створено на момент зупинки:");

  if (!progress.courseId) {
    console.log("  нічого — курс не створено.");
    return;
  }

  console.log(
    `  курс: ${progress.courseId}${progress.courseCreated ? " (створений цим запуском)" : " (існував раніше)"}`
  );

  if (progress.modules.length === 0) {
    console.log("  модулів: жодного.");
    return;
  }

  progress.modules.forEach((module) => {
    console.log(`  модуль: ${module.id}  ${module.title}`);
    module.lessons.forEach((lesson) => {
      console.log(`    урок: ${lesson.id}  ${lesson.title}`);
    });

    if (module.lessons.length === 0) {
      console.log("    уроків: жодного.");
    }
  });
}

async function main() {
  const { filePath, courseId: existingCourseId, dryRun } = parseArgs(process.argv.slice(2));

  if (existingCourseId && !isUuid(existingCourseId)) {
    throw new Error(`--course-id має бути UUID, отримано: ${existingCourseId}`);
  }

  const absolutePath = resolve(process.cwd(), filePath);
  const raw = readFileSync(absolutePath, "utf8");

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Файл не є валідним JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const needsCourse = !existingCourseId;
  const { errors, warnings } = validate(parsed, needsCourse);

  const file = parsed as CourseFile;
  const lessonCount = Array.isArray(file.modules)
    ? file.modules.reduce(
        (total, module) => total + (Array.isArray(module?.lessons) ? module.lessons.length : 0),
        0
      )
    : 0;

  console.log(`Файл: ${absolutePath}`);
  console.log(
    `Знайдено: ${Array.isArray(file.modules) ? file.modules.length : 0} модул(ів), ${lessonCount} урок(ів)`
  );

  if (warnings.length > 0) {
    console.log("");
    console.log("Попередження:");
    warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  if (errors.length > 0) {
    console.log("");
    console.error("Помилки у файлі — нічого не створено:");
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  const accessToken = process.env.ACCESS_TOKEN;
  const baseUrl =
    process.env.BACKEND_URL ??
    process.env.VITE_BACKEND_URL ??
    `http://localhost:${process.env.PORT ?? "4000"}`;

  if (dryRun) {
    console.log("");
    console.log("--dry-run: файл валідний, жодного запиту не надіслано.");
    console.log(
      existingCourseId
        ? `Реальний запуск додасть модулі до курсу ${existingCourseId}.`
        : "Реальний запуск створить новий курс-чернетку."
    );
    return;
  }

  if (!accessToken) {
    throw new Error(
      "Немає ACCESS_TOKEN. Запускайте так: ACCESS_TOKEN='<supabase access token>' node --import tsx scripts/importCourse.ts <file>"
    );
  }

  const progress: Progress = {
    courseId: existingCourseId,
    courseCreated: false,
    modules: [],
  };

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`POST ${path} → ${response.status}\n${text}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`POST ${path} повернув не JSON:\n${text}`);
    }
  }

  console.log("");
  console.log(`Бекенд: ${baseUrl}`);

  try {
    if (!existingCourseId) {
      const courseTitle = file.course!.title.trim();
      const created = await post<{ course: { id: string } }>("/authoring/courses", {
        title: courseTitle,
        description: file.course!.description ?? null,
        status: "draft",
        is_published: false,
      });

      progress.courseId = created.course.id;
      progress.courseCreated = true;

      console.log("");
      console.log(`Курс створено (чернетка): ${progress.courseId}`);
      console.log(`  ${courseTitle}`);
    } else {
      console.log("");
      console.log(`Курс не створюється, додаємо до наявного: ${existingCourseId}`);
    }

    for (const module of file.modules) {
      const createdModule = await post<{ module: { id: string } }>("/authoring/modules", {
        course_id: progress.courseId,
        title: module.title.trim(),
        order: module.order,
      });

      const moduleRecord: CreatedModule = {
        id: createdModule.module.id,
        title: module.title.trim(),
        lessons: [],
      };

      progress.modules.push(moduleRecord);
      console.log(`  модуль ${module.order}: ${moduleRecord.id}  ${moduleRecord.title}`);

      for (const lesson of module.lessons) {
        const createdLesson = await post<{ lesson: { id: string } }>(
          `/auth/course-builder/modules/${moduleRecord.id}/lessons`,
          {
            title: lesson.title.trim(),
            content: lesson.content,
            contentType: "rich_text",
            order: lesson.order,
          }
        );

        moduleRecord.lessons.push({
          id: createdLesson.lesson.id,
          title: lesson.title.trim(),
        });

        console.log(`    урок ${lesson.order}: ${createdLesson.lesson.id}  ${lesson.title.trim()}`);
      }
    }
  } catch (error) {
    console.error("");
    console.error("Імпорт зупинено.");
    console.error(error instanceof Error ? error.message : String(error));
    printProgress(progress);
    process.exit(1);
  }

  console.log("");
  console.log("Готово.");
  console.log(`Курс: ${progress.courseId}`);
  console.log(
    `Додано: ${progress.modules.length} модул(ів), ${progress.modules.reduce((total, module) => total + module.lessons.length, 0)} урок(ів)`
  );

  if (progress.courseCreated) {
    console.log("");
    console.log("Для наступних файлів запускайте з:");
    console.log(`  --course-id ${progress.courseId}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
