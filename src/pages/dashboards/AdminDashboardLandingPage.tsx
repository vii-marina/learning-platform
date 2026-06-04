import { BookOpen, ClipboardList, Code2, Eye, Layers3, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  loadAdminCourseDetailData,
  loadAdminCoursesData,
  loadAdminLandingSettingsData,
  saveAdminLandingSettingsData,
} from "../../features/admin-dashboard/api/adminDashboardApi";
import { sortAdminCoursesByRecent } from "../../features/admin-dashboard/lib/adminCourseStatus";
import type {
  AdminDashboardCourse,
  AdminDashboardCourseSummary,
  AdminDashboardLesson,
  AdminDashboardModule,
  AdminDashboardTest,
} from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import { listExercisesByModule, type Exercise } from "../../features/courses/api";

type PageMessage = {
  type: "error" | "success";
  text: string;
} | null;

type LessonOption = {
  module: AdminDashboardModule;
  lesson: AdminDashboardLesson;
};

type PreviewMode = "lesson" | "test" | "exercise";

function getAlertClassName(type: "error" | "success") {
  return type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-cyan-200 bg-cyan-50 text-cyan-900";
}

function flattenCourseLessons(course: AdminDashboardCourse | null) {
  if (!course) {
    return [] as LessonOption[];
  }

  return course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      module,
      lesson,
    }))
  );
}

function getLinkedTest(option: LessonOption | null) {
  if (!option) {
    return null;
  }

  return (
    option.lesson.linkedTests[0] ??
    option.module.tests.find((test) => test.after_lesson_id === option.lesson.id) ??
    null
  );
}

function getLinkedExercise(
  option: LessonOption | null,
  exercisesByModule: Record<string, Exercise[]>
) {
  if (!option) {
    return null;
  }

  const moduleExercises = exercisesByModule[option.module.id] ?? [];

  return (
    moduleExercises.find((exercise) => exercise.after_lesson_id === option.lesson.id) ??
    moduleExercises[0] ??
    null
  );
}

function getExerciseQuestion(exercise: Exercise | null) {
  if (!exercise) {
    return "";
  }

  const question = exercise.content.question;

  return typeof question === "string"
    ? question
    : exercise.description ?? "Практична вправа до вибраного уроку.";
}

function getExerciseCode(exercise: Exercise | null) {
  if (!exercise) {
    return "";
  }

  const initialCode = exercise.content.type === "write_code" ? exercise.content.initial_code : "";
  const codeTemplate =
    exercise.content.type === "drag_drop_code" ? exercise.content.code_template : "";

  return initialCode || codeTemplate || "";
}

function TestPreviewCard({ test }: { test: AdminDashboardTest }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase text-violet-700">Тест</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#14213d]">
          {test.title}
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {`${test.questions.length} запитань у тесті`}
        </p>
      </div>

      <div className="space-y-3">
        {test.questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-xl border border-violet-100 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-black text-violet-800">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black leading-6 text-[#14213d]">
                  {question.question_text}
                </p>
                <div className="mt-3 grid gap-2">
                  {question.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        answer.is_correct
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {answer.answer_text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ExercisePreviewCard({ exercise }: { exercise: Exercise }) {
  const code = getExerciseCode(exercise);

  return (
    <div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#14213d]">
        {exercise.title}
      </h2>
      <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold leading-6 text-orange-900">
        {getExerciseQuestion(exercise)}
      </p>
      {code ? (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#111827] p-4 text-sm font-bold leading-6 text-slate-100">
          <code>{code}</code>
        </pre>
      ) : null}
    </div>
  );
}

function LessonPreviewCard({ option }: { option: LessonOption }) {
  const hasHtmlContent = Boolean(option.lesson.content?.trim());

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">
          <Layers3 className="h-3.5 w-3.5" />
          {`Модуль ${option.module.order}`}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
          <BookOpen className="h-3.5 w-3.5" />
          {`Урок ${option.module.order}.${option.lesson.order}`}
        </span>
      </div>

      <h2 className="mt-5 text-3xl font-black tracking-tight text-[#14213d]">
        {option.lesson.title}
      </h2>

      {hasHtmlContent ? (
        <div
          className="prose prose-slate mt-5 max-w-none text-slate-700 prose-headings:text-[#14213d] prose-a:text-[#08bfd4] prose-code:rounded-md prose-code:bg-cyan-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[#087f8f]"
          dangerouslySetInnerHTML={{ __html: option.lesson.content ?? "" }}
        />
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-500">
          У цього уроку поки немає контенту для перегляду.
        </div>
      )}
    </div>
  );
}

export function AdminDashboardLandingPage() {
  const [courses, setCourses] = useState<AdminDashboardCourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("lesson");
  const [courseDetails, setCourseDetails] = useState<Record<string, AdminDashboardCourse>>({});
  const [exercisesByModule, setExercisesByModule] = useState<Record<string, Exercise[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [message, setMessage] = useState<PageMessage>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLandingBuilder() {
      try {
        setIsLoading(true);
        const [nextCourses, landingSettings] = await Promise.all([
          loadAdminCoursesData(),
          loadAdminLandingSettingsData(),
        ]);
        const sortedCourses = nextCourses.sort(sortAdminCoursesByRecent);
        const defaultCourseId =
          landingSettings.settings?.course_id ??
          landingSettings.preview?.course.id ??
          sortedCourses[0]?.id ??
          "";
        const defaultLessonId =
          landingSettings.settings?.lesson_id ?? landingSettings.preview?.lesson.id ?? "";

        if (!isMounted) {
          return;
        }

        setCourses(sortedCourses);
        setSelectedCourseId(defaultCourseId);
        setSelectedLessonId(defaultLessonId);
        setMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage({
          type: "error",
          text: getErrorMessage(error, "Не вдалося завантажити конструктор лендінгу."),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateLandingBuilder();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!selectedCourseId || courseDetails[selectedCourseId]) {
      return;
    }

    async function hydrateSelectedCourse() {
      try {
        setIsLoadingCourse(true);
        const course = await loadAdminCourseDetailData(selectedCourseId);
        const exerciseEntries = await Promise.all(
          course.modules.map(async (module) => [
            module.id,
            await listExercisesByModule(module.id),
          ] as const)
        );

        if (!isMounted) {
          return;
        }

        setCourseDetails((currentDetails) => ({
          ...currentDetails,
          [course.id]: course,
        }));
        setExercisesByModule((currentExercises) => ({
          ...currentExercises,
          ...Object.fromEntries(exerciseEntries),
        }));
        setMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage({
          type: "error",
          text: getErrorMessage(error, "Не вдалося завантажити уроки вибраного курсу."),
        });
      } finally {
        if (isMounted) {
          setIsLoadingCourse(false);
        }
      }
    }

    void hydrateSelectedCourse();

    return () => {
      isMounted = false;
    };
  }, [courseDetails, selectedCourseId]);

  const selectedCourse = selectedCourseId ? courseDetails[selectedCourseId] ?? null : null;
  const selectedCourseSummary = courses.find((course) => course.id === selectedCourseId) ?? null;
  const lessonOptions = useMemo(() => flattenCourseLessons(selectedCourse), [selectedCourse]);
  const selectedLesson =
    lessonOptions.find((item) => item.lesson.id === selectedLessonId) ?? lessonOptions[0] ?? null;
  const selectedTest = getLinkedTest(selectedLesson);
  const selectedExercise = getLinkedExercise(selectedLesson, exercisesByModule);
  const resolvedPreviewMode =
    previewMode === "test" && !selectedTest
      ? "lesson"
      : previewMode === "exercise" && !selectedExercise
        ? "lesson"
        : previewMode;
  const canSave = Boolean(selectedCourseId && selectedLesson?.lesson.id && !isSaving);

  useEffect(() => {
    if (!selectedCourse || selectedLessonId) {
      return;
    }

    const firstLesson = flattenCourseLessons(selectedCourse)[0] ?? null;

    if (firstLesson) {
      setSelectedLessonId(firstLesson.lesson.id);
    }
  }, [selectedCourse, selectedLessonId]);

  async function handleSaveLandingSettings() {
    if (!canSave || !selectedLesson) {
      return;
    }

    try {
      setIsSaving(true);
      await saveAdminLandingSettingsData({
        courseId: selectedCourseId,
        lessonId: selectedLesson.lesson.id,
      });
      setSelectedLessonId(selectedLesson.lesson.id);
      setMessage({
        type: "success",
        text: "Налаштування лендінгу збережено.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Не вдалося зберегти налаштування лендінгу."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
            Лендінг
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Виберіть курс і урок, перегляньте матеріал у реальному форматі та застосуйте його на головну сторінку.
          </p>
        </div>
        <a
          href="/#course-preview"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-5 text-sm font-bold text-[#14213d] transition hover:border-cyan-300 hover:bg-cyan-50"
        >
          <Eye className="h-4 w-4" />
          Переглянути лендінг
        </a>
      </section>

      {message ? (
        <Card className={`p-4 shadow-none ${getAlertClassName(message.type)}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState variant="section" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="min-h-[36rem] rounded-xl border-cyan-100 bg-[#f4fbfd] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            {isLoadingCourse ? (
              <LoadingState variant="inline" className="min-h-[24rem]" />
            ) : selectedLesson ? (
              resolvedPreviewMode === "test" && selectedTest ? (
                <TestPreviewCard test={selectedTest} />
              ) : resolvedPreviewMode === "exercise" && selectedExercise ? (
                <ExercisePreviewCard exercise={selectedExercise} />
              ) : (
                <LessonPreviewCard option={selectedLesson} />
              )
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm font-semibold text-slate-500">
                У вибраному курсі немає уроків для показу на лендінгу.
              </div>
            )}
          </Card>

          <aside className="space-y-5">
            <Card className="rounded-xl border-cyan-100 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-black tracking-tight text-[#14213d]">
                Налаштування превʼю
              </h2>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-bold text-[#14213d]">Курс</span>
                <select
                  value={selectedCourseId}
                  onChange={(event) => {
                    setSelectedCourseId(event.target.value);
                    setSelectedLessonId("");
                    setPreviewMode("lesson");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-bold text-[#14213d]">Урок</span>
                <select
                  value={selectedLesson?.lesson.id ?? ""}
                  onChange={(event) => {
                    setSelectedLessonId(event.target.value);
                    setPreviewMode("lesson");
                  }}
                  disabled={isLoadingCourse || lessonOptions.length === 0}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {lessonOptions.map(({ module, lesson }) => (
                    <option key={lesson.id} value={lesson.id}>
                      {`Модуль ${module.order} · Урок ${module.order}.${lesson.order} ${lesson.title}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-bold text-[#14213d]">Що переглянути</span>
                <select
                  value={resolvedPreviewMode}
                  onChange={(event) => setPreviewMode(event.target.value as PreviewMode)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
                >
                  <option value="lesson">Урок</option>
                  <option value="test" disabled={!selectedTest}>
                    Тест{selectedTest ? "" : " недоступний"}
                  </option>
                  <option value="exercise" disabled={!selectedExercise}>
                    Вправа{selectedExercise ? "" : " недоступна"}
                  </option>
                </select>
              </label>

              <button
                type="button"
                disabled={!canSave}
                onClick={() => {
                  void handleSaveLandingSettings();
                }}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#13daec] px-6 text-sm font-black text-[#14213d] shadow-[0_16px_32px_rgba(19,218,236,0.24)] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Збереження..." : "Застосувати на лендінг"}
              </button>
            </Card>

            <Card className="rounded-xl border-cyan-100 bg-white p-5 shadow-none">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-bold uppercase text-slate-400">Курс</p>
                  <p className="mt-1 text-sm font-bold leading-5 text-[#14213d]">
                    {selectedCourseSummary?.title ?? "Не вибрано"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-bold uppercase text-slate-400">Урок</p>
                  <p className="mt-1 text-sm font-bold leading-5 text-[#14213d]">
                    {selectedLesson?.lesson.title ?? "Не вибрано"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                    <ClipboardList className="h-4 w-4 text-violet-700" />
                    <p className="mt-2 text-xs font-bold text-violet-800">
                      {selectedTest ? "Тест є" : "Без тесту"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
                    <Code2 className="h-4 w-4 text-orange-700" />
                    <p className="mt-2 text-xs font-bold text-orange-800">
                      {selectedExercise ? "Вправа є" : "Без вправи"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
