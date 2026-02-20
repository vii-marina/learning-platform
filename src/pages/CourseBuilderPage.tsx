import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { supabase } from "../lib/supabase";
import type { Course, Lesson, Module } from "../components/admin/types";
import { RichTextEditor } from "../components/admin/RichTextEditor";

const steps = [
  { id: 1, label: "Basics", helper: "Course information" },
  { id: 2, label: "Course Content", helper: "Modules, lessons & tests" },
  { id: 3, label: "Review & Publish", helper: "Launch course" },
];

type TestQuestionType = "Multiple Choice" | "True/False" | "Short Answer";

type TestQuestion = {
  id: string;
  text: string;
  type: TestQuestionType;
  options: string[];
  correct: string;
};

type CourseTest = {
  id: string;
  title: string;
  description: string;
  minScore: string;
  questions: TestQuestion[];
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [lessonEditorModuleId, setLessonEditorModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonMinScore, setLessonMinScore] = useState("");

  const [testsByModule, setTestsByModule] = useState<Record<string, CourseTest[]>>({});
  const [testEditorModuleId, setTestEditorModuleId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testMinScore, setTestMinScore] = useState("");
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === currentCourseId) || null,
    [courses, currentCourseId]
  );

  const isBasicsComplete =
    courseTitle.trim().length > 0 && courseDescription.trim().length > 0;

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      setMessage("Unable to load courses.");
      return;
    }
    setCourses(data || []);
  };

  const fetchModules = async (courseId: string) => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true });
    if (error) {
      setMessage("Unable to load modules.");
      return;
    }
    setModules(data || []);
  };

  const fetchLessons = async (moduleId: string) => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("order", { ascending: true });
    if (error) {
      setMessage("Unable to load lessons.");
      return;
    }
    setLessonsByModule((prev) => ({ ...prev, [moduleId]: data || [] }));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      setCourseTitle(selectedCourse.title);
      setCourseDescription(selectedCourse.description || "");
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (currentCourseId) {
      fetchModules(currentCourseId);
    } else {
      setModules([]);
      setLessonsByModule({});
    }
  }, [currentCourseId]);

  const handleSaveDraft = async () => {
    if (!isBasicsComplete) return;
    if (currentCourseId) {
      const { error } = await supabase
        .from("courses")
        .update({
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
        })
        .eq("id", currentCourseId);
      if (error) {
        setMessage("Unable to update course.");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: courseTitle.trim(),
          description: courseDescription.trim() || null,
          is_published: false,
        })
        .select("id")
        .single();
      if (error) {
        setMessage("Unable to create course.");
        return;
      }
      setCurrentCourseId(data?.id ?? null);
    }
    fetchCourses();
  };

  const handleCreateModule = async () => {
    if (!currentCourseId || !newModuleTitle.trim()) return;
    const nextOrder =
      modules.length === 0 ? 1 : Math.max(...modules.map((m) => m.order)) + 1;
    const { error } = await supabase.from("modules").insert({
      course_id: currentCourseId,
      title: newModuleTitle.trim(),
      order: nextOrder,
    });
    if (error) {
      setMessage("Unable to create module.");
      return;
    }
    setNewModuleTitle("");
    fetchModules(currentCourseId);
  };

  const handleUpdateModule = async () => {
    if (!editModuleId || !editModuleTitle.trim()) return;
    const { error } = await supabase
      .from("modules")
      .update({ title: editModuleTitle.trim() })
      .eq("id", editModuleId);
    if (error) {
      setMessage("Unable to update module.");
      return;
    }
    setEditModuleId(null);
    if (currentCourseId) {
      fetchModules(currentCourseId);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this module?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", moduleId);
    if (error) {
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
      fetchModules(currentCourseId);
    }
  };

  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    if (!currentCourseId) return;
    const index = modules.findIndex((module) => module.id === moduleId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= modules.length) return;
    const current = modules[index];
    const target = modules[swapWith];
    const { error } = await supabase
      .from("modules")
      .upsert([
        { id: current.id, order: target.order },
        { id: target.id, order: current.order },
      ]);
    if (error) {
      setMessage("Unable to reorder modules.");
      return;
    }
    fetchModules(currentCourseId);
  };

  const toggleModule = async (moduleId: string) => {
    const nextId = expandedModuleId === moduleId ? null : moduleId;
    setExpandedModuleId(nextId);
    if (nextId && !lessonsByModule[nextId]) {
      await fetchLessons(nextId);
    }
  };

  const resetLessonEditor = () => {
    setLessonEditorModuleId(null);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonDuration("");
    setLessonMinScore("");
  };

  const startNewLesson = (moduleId: string) => {
    setLessonEditorModuleId(moduleId);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonDuration("");
    setLessonMinScore("");
  };

  const startEditLesson = (moduleId: string, lesson: Lesson) => {
    setLessonEditorModuleId(moduleId);
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonVideoUrl("");
    setLessonDuration("");
    setLessonMinScore("");
  };

  const handleSaveLesson = async () => {
    if (!lessonEditorModuleId || !lessonTitle.trim()) return;
    const moduleId = lessonEditorModuleId;
    if (editingLessonId) {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: lessonTitle.trim(),
          content: lessonContent,
          content_type: "html",
        })
        .eq("id", editingLessonId);
      if (error) {
        setMessage("Unable to update lesson.");
        return;
      }
    } else {
      const lessons = lessonsByModule[moduleId] || [];
      const nextOrder =
        lessons.length === 0 ? 1 : Math.max(...lessons.map((l) => l.order)) + 1;
      const { error } = await supabase.from("lessons").insert({
        module_id: moduleId,
        title: lessonTitle.trim(),
        content: lessonContent,
        content_type: "html",
        order: nextOrder,
      });
      if (error) {
        setMessage("Unable to create lesson.");
        return;
      }
    }
    await fetchLessons(moduleId);
    resetLessonEditor();
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!window.confirm("Delete this lesson?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) {
      setMessage("Unable to delete lesson.");
      return;
    }
    await fetchLessons(moduleId);
  };

  const moveLesson = async (
    moduleId: string,
    lessonId: string,
    direction: "up" | "down"
  ) => {
    const lessons = lessonsByModule[moduleId] || [];
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= lessons.length) return;
    const current = lessons[index];
    const target = lessons[swapWith];
    const { error } = await supabase
      .from("lessons")
      .upsert([
        { id: current.id, order: target.order },
        { id: target.id, order: current.order },
      ]);
    if (error) {
      setMessage("Unable to reorder lessons.");
      return;
    }
    await fetchLessons(moduleId);
  };

  const resetTestEditor = () => {
    setTestEditorModuleId(null);
    setEditingTestId(null);
    setTestTitle("");
    setTestDescription("");
    setTestMinScore("");
    setTestQuestions([]);
  };

  const startNewTest = (moduleId: string) => {
    setTestEditorModuleId(moduleId);
    setEditingTestId(null);
    setTestTitle("");
    setTestDescription("");
    setTestMinScore("");
    setTestQuestions([]);
  };

  const startEditTest = (moduleId: string, test: CourseTest) => {
    setTestEditorModuleId(moduleId);
    setEditingTestId(test.id);
    setTestTitle(test.title);
    setTestDescription(test.description);
    setTestMinScore(test.minScore);
    setTestQuestions(test.questions);
  };

  const handleSaveTest = () => {
    if (!testEditorModuleId || !testTitle.trim()) return;
    const moduleId = testEditorModuleId;
    setTestsByModule((prev) => {
      const list = prev[moduleId] || [];
      const updated: CourseTest = {
        id: editingTestId || createId(),
        title: testTitle.trim(),
        description: testDescription,
        minScore: testMinScore,
        questions: testQuestions,
      };
      const nextList = editingTestId
        ? list.map((item) => (item.id === editingTestId ? updated : item))
        : [...list, updated];
      return { ...prev, [moduleId]: nextList };
    });
    resetTestEditor();
  };

  const handleDeleteTest = (moduleId: string, testId: string) => {
    if (!window.confirm("Delete this test?")) return;
    setTestsByModule((prev) => {
      const list = prev[moduleId] || [];
      return { ...prev, [moduleId]: list.filter((item) => item.id !== testId) };
    });
  };

  const addQuestion = () => {
    setTestQuestions((prev) => [
      ...prev,
      {
        id: createId(),
        text: "",
        type: "Multiple Choice",
        options: ["Option 1", "Option 2"],
        correct: "Option 1",
      },
    ]);
  };

  const updateQuestion = (
    questionId: string,
    patch: Partial<TestQuestion>
  ) => {
    setTestQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      )
    );
  };

  const removeQuestion = (questionId: string) => {
    setTestQuestions((prev) => prev.filter((question) => question.id !== questionId));
  };

  const courseWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!modules.length) {
      warnings.push("⚠ No modules created yet.");
    }
    modules.forEach((module) => {
      const lessons = lessonsByModule[module.id] || [];
      if (lessons.length === 0) {
        warnings.push(`⚠ No lessons in ${module.title}.`);
      }
    });
    return warnings;
  }, [modules, lessonsByModule]);

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
                <Input
                  value={newModuleTitle}
                  onChange={(event) => setNewModuleTitle(event.target.value)}
                  placeholder="New module title"
                  className="w-64"
                />
                <Button onClick={handleCreateModule} disabled={!currentCourseId}>
                  Add module
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
                        <span className="text-base font-semibold text-slate-900">
                          {module.title}
                        </span>
                        <span className="text-xs text-slate-400">
                          {isExpanded ? "Hide" : "Show"}
                        </span>
                      </button>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <button type="button" onClick={() => moveModule(module.id, "up")}>
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModule(module.id, "down")}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditModuleId(module.id);
                          setEditModuleTitle(module.title);
                        }}
                      >
                        ✎
                      </button>
                      <button type="button" onClick={() => handleDeleteModule(module.id)}>
                        🗑
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <div className="flex flex-col gap-6">
                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Lessons
                              </h3>
                              <p className="text-xs text-slate-500">
                                Build lesson content and materials.
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => startNewLesson(module.id)}
                            >
                              + Add Lesson
                            </Button>
                          </div>

                          <div className="flex flex-col gap-3">
                            {lessons.map((lesson, index) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-400">≡</span>
                                  <span className="text-xs text-slate-400">
                                    {index + 1}.
                                  </span>
                                  <span className="font-medium text-slate-900">
                                    {lesson.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <button
                                    type="button"
                                    onClick={() => moveLesson(module.id, lesson.id, "up")}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveLesson(module.id, lesson.id, "down")}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEditLesson(module.id, lesson)}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLesson(module.id, lesson.id)}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {lessonEditorModuleId === module.id ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-4">
                                <Input
                                  value={lessonTitle}
                                  onChange={(event) => setLessonTitle(event.target.value)}
                                  placeholder="Lesson title"
                                />
                                <RichTextEditor
                                  value={lessonContent}
                                  onChange={setLessonContent}
                                  placeholder="Write lesson content..."
                                />
                                <div className="grid gap-3 md:grid-cols-2">
                                  <Input
                                    value={lessonVideoUrl}
                                    onChange={(event) =>
                                      setLessonVideoUrl(event.target.value)
                                    }
                                    placeholder="Video URL"
                                  />
                                  <Input
                                    value={lessonDuration}
                                    onChange={(event) =>
                                      setLessonDuration(event.target.value)
                                    }
                                    placeholder="Duration (e.g. 12:30)"
                                  />
                                </div>
                                <Input
                                  value={lessonMinScore}
                                  onChange={(event) =>
                                    setLessonMinScore(event.target.value)
                                  }
                                  placeholder="Optional minimum score"
                                />
                                <div className="flex gap-2">
                                  <Button onClick={handleSaveLesson}>
                                    Save lesson
                                  </Button>
                                  <Button variant="secondary" onClick={resetLessonEditor}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Tests
                              </h3>
                              <p className="text-xs text-slate-500">
                                Draft quizzes and knowledge checks.
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => startNewTest(module.id)}
                            >
                              + Add Test
                            </Button>
                          </div>

                          <div className="flex flex-col gap-3">
                            {tests.map((test) => (
                              <div
                                key={test.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"
                              >
                                <span className="font-medium text-slate-900">
                                  {test.title}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <button
                                    type="button"
                                    onClick={() => startEditTest(module.id, test)}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTest(module.id, test.id)}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {testEditorModuleId === module.id ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-4">
                                <Input
                                  value={testTitle}
                                  onChange={(event) => setTestTitle(event.target.value)}
                                  placeholder="Test title"
                                />
                                <textarea
                                  value={testDescription}
                                  onChange={(event) =>
                                    setTestDescription(event.target.value)
                                  }
                                  placeholder="Test description"
                                  className="h-24 w-full rounded border border-slate-300 bg-white/85 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                                <Input
                                  value={testMinScore}
                                  onChange={(event) => setTestMinScore(event.target.value)}
                                  placeholder="Minimum score"
                                />

                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-900">
                                      Questions
                                    </h4>
                                    <Button variant="secondary" onClick={addQuestion}>
                                      + Add Question
                                    </Button>
                                  </div>
                                  {testQuestions.map((question, index) => (
                                    <div
                                      key={question.id}
                                      className="rounded-xl border border-slate-200 bg-white p-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                          Question {index + 1}
                                        </span>
                                        <button
                                          type="button"
                                          className="text-xs text-slate-400"
                                          onClick={() => removeQuestion(question.id)}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      <div className="mt-3 flex flex-col gap-3">
                                        <Input
                                          value={question.text}
                                          onChange={(event) =>
                                            updateQuestion(question.id, {
                                              text: event.target.value,
                                            })
                                          }
                                          placeholder="Question text"
                                        />
                                        <select
                                          value={question.type}
                                          onChange={(event) => {
                                            const value = event.target
                                              .value as TestQuestionType;
                                            const baseOptions =
                                              value === "True/False"
                                                ? ["True", "False"]
                                                : ["Option 1", "Option 2"];
                                            updateQuestion(question.id, {
                                              type: value,
                                              options:
                                                value === "Short Answer"
                                                  ? []
                                                  : baseOptions,
                                              correct:
                                                value === "Short Answer"
                                                  ? ""
                                                  : baseOptions[0],
                                            });
                                          }}
                                          className="rounded border border-slate-300 bg-white/85 px-3 py-2 text-sm"
                                        >
                                          <option>Multiple Choice</option>
                                          <option>True/False</option>
                                          <option>Short Answer</option>
                                        </select>
                                        {question.type !== "Short Answer" ? (
                                          <div className="flex flex-col gap-2">
                                            {question.options.map((option, optionIndex) => (
                                              <Input
                                                key={`${question.id}-${optionIndex}`}
                                                value={option}
                                                onChange={(event) => {
                                                  const next = [...question.options];
                                                  next[optionIndex] = event.target.value;
                                                  updateQuestion(question.id, {
                                                    options: next,
                                                    correct:
                                                      question.correct === option
                                                        ? event.target.value
                                                        : question.correct,
                                                  });
                                                }}
                                                placeholder={`Option ${optionIndex + 1}`}
                                              />
                                            ))}
                                            <Button
                                              variant="secondary"
                                              onClick={() =>
                                                updateQuestion(question.id, {
                                                  options: [
                                                    ...question.options,
                                                    `Option ${question.options.length + 1}`,
                                                  ],
                                                })
                                              }
                                            >
                                              + Add option
                                            </Button>
                                            <select
                                              value={question.correct}
                                              onChange={(event) =>
                                                updateQuestion(question.id, {
                                                  correct: event.target.value,
                                                })
                                              }
                                              className="rounded border border-slate-300 bg-white/85 px-3 py-2 text-sm"
                                            >
                                              {question.options.map((option) => (
                                                <option key={option} value={option}>
                                                  {option}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        ) : (
                                          <Input
                                            value={question.correct}
                                            onChange={(event) =>
                                              updateQuestion(question.id, {
                                                correct: event.target.value,
                                              })
                                            }
                                            placeholder="Correct answer"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex gap-2">
                                  <Button onClick={handleSaveTest}>Save test</Button>
                                  <Button variant="secondary" onClick={resetTestEditor}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </section>
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
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end">
              <Button>Publish Course</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
