import { ClipboardList, Code2, Eye, Save } from "lucide-react";
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
} from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import { listExercisesByModule, type Exercise } from "../../features/courses/api";
import {
  ExercisePreviewCard,
  LessonPreviewCard,
  TestPreviewCard,
} from "./admin-landing/LandingPreviewCards";
import {
  flattenCourseLessons,
  getAlertClassName,
  getLinkedExercise,
  getLinkedTest,
  type PageMessage,
  type PreviewMode,
} from "./admin-landing/landingSelectionSelectors";


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

            <Card className="rounded-xl border-cyan-100 shadow-none">
              <div className="space-y-3">
                
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
