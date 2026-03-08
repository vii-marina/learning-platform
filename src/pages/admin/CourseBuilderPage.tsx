import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { supabase } from "../../lib/supabase";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  TriangleAlert,
  Trash2,
} from "lucide-react";
import {
  createCourse,
  createLesson,
  createModule,
  deleteModule,
  listCourses,
  listLessonsByModule,
  listModulesByCourse,
  publishCourse,
  swapModuleOrder,
  updateCourse,
  updateModule,
} from "../../features/courses/api";
import type { Course, Lesson, Module } from "../../features/courses/api";
import { CreateModuleModal } from "../../features/courses/components/admin/CreateModuleModal";
import { LessonCreateModal } from "../../features/courses/components/admin/LessonCreateModal";
import { ModuleLessonsSection } from "../../features/courses/components/admin/ModuleLessonsSection";
import { ModuleTestsSection } from "../../features/courses/components/admin/ModuleTestsSection";
import { TestCreateModal } from "../../features/courses/components/admin/TestCreateModal";
import type {
  CourseTest,
  CourseTestQuestion,
} from "../../features/courses/components/admin/courseBuilderUiTypes";

const steps = [
  { id: 1, label: "Basics", helper: "Course information" },
  { id: 2, label: "Course Content", helper: "Modules, lessons & tests" },
  { id: 3, label: "Review & Publish", helper: "Launch course" },
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyTestQuestion = (): CourseTestQuestion => ({
  id: createId(),
  type: "single_choice",
  questionText: "",
  options: ["Option 1", "Option 2"],
  correctOptionIndexes: [],
});

const isQuestionValid = (question: CourseTestQuestion) => {
  if (!question.questionText.trim()) {
    return false;
  }

  if (question.type === "true_false") {
    return (
      question.correctOptionIndexes.length === 1 &&
      (question.correctOptionIndexes[0] === 0 || question.correctOptionIndexes[0] === 1)
    );
  }

  if (question.options.length < 2 || question.options.some((option) => !option.trim())) {
    return false;
  }

  if (question.correctOptionIndexes.length === 0) {
    return false;
  }

  if (
    question.correctOptionIndexes.some(
      (optionIndex) => optionIndex < 0 || optionIndex >= question.options.length
    )
  ) {
    return false;
  }

  if (question.type === "single_choice" && question.correctOptionIndexes.length !== 1) {
    return false;
  }

  return true;
};

const canSaveTestDraft = (title: string, questions: CourseTestQuestion[]) => {
  if (!title.trim() || questions.length === 0) {
    return false;
  }

  return questions.every(isQuestionValid);
};

export function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [lessonEditorModuleId, setLessonEditorModuleId] = useState<string | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");

  const [testsByModule, setTestsByModule] = useState<Record<string, CourseTest[]>>({});
  const [testEditorModuleId, setTestEditorModuleId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("");
  const [testQuestions, setTestQuestions] = useState<CourseTestQuestion[]>([]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === currentCourseId) || null,
    [courses, currentCourseId]
  );

  const canSaveCurrentTest = useMemo(
    () => canSaveTestDraft(testTitle, testQuestions),
    [testQuestions, testTitle]
  );

  const isBasicsComplete =
    courseTitle.trim().length > 0 && courseDescription.trim().length > 0;

  const fetchCourses = async () => {
    try {
      const data = await listCourses();
      setCourses(data);
      setMessage("");
    } catch {
      setMessage("Unable to load courses.");
    }
  };

  const fetchModules = async (courseId: string) => {
    try {
      const data = await listModulesByCourse(courseId);
      setModules(data);
      setMessage("");
    } catch {
      setMessage("Unable to load modules.");
    }
  };

  const fetchLessons = async (moduleId: string) => {
    try {
      const data = await listLessonsByModule(moduleId);
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: data }));
      setMessage("");
    } catch {
      setMessage("Unable to load lessons.");
    }
  };

  const getCurrentTeacherId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Unable to resolve current teacher.");
    }
    return data.user.id;
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchCourses();
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      queueMicrotask(() => {
        setCourseTitle(selectedCourse.title);
        setCourseDescription(selectedCourse.description || "");
      });
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (currentCourseId) {
      queueMicrotask(() => {
        void fetchModules(currentCourseId);
      });
    } else {
      queueMicrotask(() => {
        setModules([]);
        setLessonsByModule({});
      });
    }
  }, [currentCourseId]);

  const handleSaveDraft = async () => {
    if (!isBasicsComplete) return;
    try {
      if (currentCourseId) {
        await updateCourse(currentCourseId, {
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
        });
      } else {
        const teacherId = await getCurrentTeacherId();
        const course = await createCourse({
          teacher_id: teacherId,
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
          is_published: false,
        });
        setCurrentCourseId(course.id);
      }
      await fetchCourses();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }
      setMessage(currentCourseId ? "Unable to update course." : "Unable to create course.");
    }
  };

  const openCreateModuleModal = () => {
    setNewModuleTitle("");
    setIsCreateModuleModalOpen(true);
  };

  const closeCreateModuleModal = () => {
    setIsCreateModuleModalOpen(false);
    setNewModuleTitle("");
  };

  const handleSaveModuleModal = async () => {
    if (!currentCourseId || !newModuleTitle.trim()) return;

    try {
      setIsCreatingModule(true);
      const module = await createModule({
        course_id: currentCourseId,
        title: newModuleTitle.trim(),
      });
      await fetchModules(currentCourseId);
      setExpandedModuleId(module.id);
      closeCreateModuleModal();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }
      setMessage("Unable to create module.");
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editModuleId || !editModuleTitle.trim()) return;
    try {
      await updateModule(editModuleId, { title: editModuleTitle.trim() });
      setEditModuleId(null);
      setEditModuleTitle("");
      if (currentCourseId) {
        await fetchModules(currentCourseId);
      }
      setMessage("");
    } catch {
      setMessage("Unable to update module.");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this module?")) return;
    try {
      await deleteModule(moduleId);
    } catch {
      setMessage("Unable to delete module.");
      return;
    }
    setLessonsByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    setTestsByModule((prev) => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
    if (expandedModuleId === moduleId) {
      setExpandedModuleId(null);
    }
    if (currentCourseId) {
      await fetchModules(currentCourseId);
    }
    setMessage("");
  };

  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    if (!currentCourseId) return;
    const index = modules.findIndex((module) => module.id === moduleId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= modules.length) return;
    const current = modules[index];
    const target = modules[swapWith];
    try {
      await swapModuleOrder(current, target);
      await fetchModules(currentCourseId);
      setMessage("");
    } catch {
      setMessage("Unable to reorder modules.");
    }
  };

  const toggleModule = async (moduleId: string) => {
    const nextId = expandedModuleId === moduleId ? null : moduleId;
    setExpandedModuleId(nextId);
    if (nextId && !lessonsByModule[nextId]) {
      await fetchLessons(nextId);
    }
  };

  const closeCreateLessonModal = () => {
    setLessonEditorModuleId(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
  };

  const openCreateLessonModal = (moduleId: string) => {
    setLessonEditorModuleId(moduleId);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
  };

  const handleCreateLesson = async () => {
    if (!lessonEditorModuleId || !lessonTitle.trim()) return;
    const moduleId = lessonEditorModuleId;

    try {
      setIsCreatingLesson(true);
      await createLesson({
        module_id: moduleId,
        title: lessonTitle.trim(),
        content: lessonContent.trim() || null,
        video_url: lessonVideoUrl.trim() || null,
        content_type: "text",
      });
      await fetchLessons(moduleId);
      closeCreateLessonModal();
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setMessage(error.message);
        return;
      }
      setMessage("Unable to create lesson.");
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const closeCreateTestModal = () => {
    setTestEditorModuleId(null);
    setTestTitle("");
    setTestQuestions([]);
  };

  const openCreateTestModal = (moduleId: string) => {
    setTestEditorModuleId(moduleId);
    setTestTitle("");
    setTestQuestions([createEmptyTestQuestion()]);
  };

  const handleAddTestQuestion = () => {
    setTestQuestions((prev) => [...prev, createEmptyTestQuestion()]);
  };

  const handleChangeTestQuestion = (
    questionId: string,
    nextQuestion: CourseTestQuestion
  ) => {
    setTestQuestions((prev) =>
      prev.map((question) => (question.id === questionId ? nextQuestion : question))
    );
  };

  const handleDeleteTestQuestion = (questionId: string) => {
    setTestQuestions((prev) => {
      const remaining = prev.filter((question) => question.id !== questionId);
      return remaining.length > 0 ? remaining : [createEmptyTestQuestion()];
    });
  };

  const handleCreateTest = () => {
    if (!testEditorModuleId || !canSaveCurrentTest) return;
    const moduleId = testEditorModuleId;

    setTestsByModule((prev) => {
      const list = prev[moduleId] || [];
      const created: CourseTest = {
        id: createId(),
        title: testTitle.trim(),
        description: "",
        minScore: "",
        questions: testQuestions.map((question) => ({
          ...question,
          options: [...question.options],
          correctOptionIndexes: [...question.correctOptionIndexes],
        })),
      };
      return { ...prev, [moduleId]: [...list, created] };
    });

    closeCreateTestModal();
  };

  const courseWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!modules.length) {
      warnings.push("No modules created yet.");
    }
    modules.forEach((module) => {
      const lessons = lessonsByModule[module.id] || [];
      if (lessons.length === 0) {
        warnings.push(`No lessons in ${module.title}.`);
      }
    });
    return warnings;
  }, [modules, lessonsByModule]);

  const handlePublishCourse = async () => {
    if (!currentCourseId) {
      setMessage("Create a draft course before publishing.");
      return;
    }

    try {
      await publishCourse(currentCourseId);
      await fetchCourses();
      setMessage("");
    } catch {
      setMessage("Unable to publish course.");
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {courseTitle.trim() ? courseTitle.trim() : "Untitled course"}
        </h1>
        {message ? <p className="mt-3 text-xs text-red-600">{message}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex items-center justify-between">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isEnabled =
              step.id === 1 || (step.id === 2 && isBasicsComplete);
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isEnabled}
                onClick={() => setActiveStep(step.id as 1 | 2 | 3)}
                className="flex w-full flex-col items-center gap-2 text-center"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : isEnabled
                      ? "border border-slate-300 text-slate-600"
                      : "border border-slate-200 text-slate-300"
                  }`}
                >
                  {step.id}
                </span>
                <div className="text-xs font-semibold text-slate-700">
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-400">{step.helper}</div>
              </button>
            );
          })}
        </div>
      </div>

      {activeStep === 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-900">
                Course title
              </label>
              <Input
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Untitled course"
                className="text-lg font-semibold placeholder:font-normal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-900">
                Course description
              </label>
              <textarea
                value={courseDescription}
                onChange={(event) => setCourseDescription(event.target.value)}
                placeholder="Describe the outcomes for this course"
                className="h-32 w-full rounded border border-slate-300 bg-white/85 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-semibold text-slate-900">
                Course thumbnail
              </label>
              <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Drag & drop a thumbnail or click to upload
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Complete the basics to unlock course content.
              </p>
              <Button
                onClick={async () => {
                  await handleSaveDraft();
                  setActiveStep(2);
                }}
                disabled={!isBasicsComplete}
              >
                Continue to Course Content
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeStep === 2 ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Course Content
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Build modules, lessons, and tests.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={openCreateModuleModal} disabled={!currentCourseId}>
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add module
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {modules.map((module) => {
              const lessons = lessonsByModule[module.id] || [];
              const tests = testsByModule[module.id] || [];
              const isExpanded = expandedModuleId === module.id;
              return (
                <div
                  key={module.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    {editModuleId === module.id ? (
                      <div className="flex flex-1 flex-col gap-2">
                        <Input
                          value={editModuleTitle}
                          onChange={(event) =>
                            setEditModuleTitle(event.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateModule}>Save</Button>
                          <Button
                            variant="secondary"
                            onClick={() => setEditModuleId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <span className="text-sm text-slate-400">Module {module.order}</span>
                        <span className="text-base font-semibold text-slate-900">{module.title}</span>
                        <span className="text-sm text-slate-500">{lessons.length} lessons</span>
                        <span className="text-sm text-slate-500">{tests.length} tests</span>
                      </button>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => moveModule(module.id, "up")}
                        aria-label="Move module up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModule(module.id, "down")}
                        aria-label="Move module down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditModuleId(module.id);
                          setEditModuleTitle(module.title);
                        }}
                        aria-label="Edit module"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteModule(module.id)}
                        aria-label="Delete module"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <div className="flex flex-col gap-6">
                        <ModuleLessonsSection
                          moduleId={module.id}
                          lessons={lessons}
                          onOpenCreateLesson={openCreateLessonModal}
                        />

                        <ModuleTestsSection
                          moduleId={module.id}
                          tests={tests}
                          onOpenCreateTest={openCreateTestModal}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeStep === 3 ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Review & Publish
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Preview your course before publishing.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Course summary
                </h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">Title:</span>{" "}
                    {courseTitle || "Untitled course"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      Description:
                    </span>{" "}
                    {courseDescription || "No description yet."}
                  </p>
                  <div className="h-32 rounded-xl border border-dashed border-slate-300 bg-white/80" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <span className="text-xs text-slate-400">Category</span>
                      <p className="text-sm text-slate-700">Not set</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Level</span>
                      <p className="text-sm text-slate-700">Not set</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Price</span>
                      <p className="text-sm text-slate-700">Not set</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Content overview
                </h3>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  {modules.map((module) => (
                    <div key={module.id} className="rounded-xl bg-white/80 p-3">
                      <p className="font-semibold text-slate-900">
                        {module.title}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        {(lessonsByModule[module.id] || []).map((lesson) => (
                          <div key={lesson.id}>• {lesson.title}</div>
                        ))}
                        {(testsByModule[module.id] || []).map((test) => (
                          <div key={test.id}>• Test: {test.title}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {modules.length === 0 ? (
                    <p className="text-xs text-slate-400">No modules yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
            {courseWarnings.length > 0 ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                {courseWarnings.map((warning) => (
                  <div key={warning} className="flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end">
              <Button onClick={handlePublishCourse} disabled={!currentCourseId}>
                Publish Course
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LessonCreateModal
        isOpen={lessonEditorModuleId !== null}
        title={lessonTitle}
        content={lessonContent}
        videoUrl={lessonVideoUrl}
        isSaving={isCreatingLesson}
        onClose={closeCreateLessonModal}
        onSave={() => {
          void handleCreateLesson();
        }}
        onTitleChange={setLessonTitle}
        onContentChange={setLessonContent}
        onVideoUrlChange={setLessonVideoUrl}
      />

      <TestCreateModal
        isOpen={testEditorModuleId !== null}
        title={testTitle}
        questions={testQuestions}
        canSave={canSaveCurrentTest}
        onClose={closeCreateTestModal}
        onSave={handleCreateTest}
        onTitleChange={setTestTitle}
        onAddQuestion={handleAddTestQuestion}
        onQuestionChange={handleChangeTestQuestion}
        onDeleteQuestion={handleDeleteTestQuestion}
      />

      <CreateModuleModal
        isOpen={isCreateModuleModalOpen}
        title={newModuleTitle}
        isSaving={isCreatingModule}
        onTitleChange={setNewModuleTitle}
        onCancel={closeCreateModuleModal}
        onSave={() => {
          void handleSaveModuleModal();
        }}
      />
    </div>
  );
}
