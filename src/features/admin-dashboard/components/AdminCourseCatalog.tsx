import { ChevronDown } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import type {
  AdminDashboardCourse,
  AdminDashboardLesson,
  AdminDashboardModule,
  AdminDashboardTest,
  AdminDashboardTestQuestion,
} from "../types";

type AdminCourseCatalogProps = {
  courses: AdminDashboardCourse[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ContentPreview({ html }: { html: string | null }) {
  if (!html?.trim()) {
    return <p className="text-sm text-slate-500">No lesson content.</p>;
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function LessonBlockPreview({
  block,
}: {
  block: AdminDashboardLesson["blocks"][number];
}) {
  const html =
    typeof block.content === "object" &&
    block.content &&
    "html" in block.content &&
    typeof block.content.html === "string"
      ? block.content.html
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">{block.block_type}</p>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          order {block.order}
        </span>
      </div>
      <div className="mt-3">
        {html ? (
          <div
            className="rounded-xl bg-white px-3 py-3 text-sm leading-6 text-slate-700"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white px-3 py-3 text-xs leading-6 text-slate-600">
            {JSON.stringify(block.content, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function TestQuestionView({ question }: { question: AdminDashboardTestQuestion }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h6 className="text-sm font-bold text-slate-900">{question.question_text}</h6>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          {question.type}
        </span>
      </div>
      {question.hint ? (
        <p className="mt-2 text-sm text-slate-500">Hint: {question.hint}</p>
      ) : null}
      {question.answers.length > 0 ? (
        <div className="mt-4 space-y-2">
          {question.answers.map((answer) => (
            <div
              key={answer.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                answer.is_correct
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {answer.answer_text}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No answers.</p>
      )}
    </div>
  );
}

function TestView({
  test,
  lessonTitle,
}: {
  test: AdminDashboardTest;
  lessonTitle: string | null;
}) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
        <div>
          <h5 className="text-sm font-bold text-slate-900">{test.title}</h5>
          <p className="mt-1 text-sm text-slate-500">
            {lessonTitle ? `Linked after lesson: ${lessonTitle}` : "Module-level test"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
            {test.questions.length} questions
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-slate-200 px-4 py-4">
        {test.questions.length === 0 ? (
          <p className="text-sm text-slate-500">No questions.</p>
        ) : (
          <div className="space-y-3">
            {test.questions.map((question) => (
              <TestQuestionView key={question.id} question={question} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function LessonView({ lesson }: { lesson: AdminDashboardLesson }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
        <div>
          <h5 className="text-base font-bold text-slate-900">{lesson.title}</h5>
          <p className="mt-1 text-sm text-slate-500">
            {lesson.video_url ? `Video: ${lesson.video_url}` : "No linked video"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
            {lesson.blocks.length} blocks
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-slate-200 px-4 py-4">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Lesson content
            </p>
            <ContentPreview html={lesson.content} />
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Lesson blocks
            </p>
            {lesson.blocks.length === 0 ? (
              <p className="text-sm text-slate-500">No lesson blocks.</p>
            ) : (
              <div className="space-y-3">
                {lesson.blocks.map((block) => (
                  <LessonBlockPreview key={block.id} block={block} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Linked tests
            </p>
            {lesson.linkedTests.length === 0 ? (
              <p className="text-sm text-slate-500">No tests linked to this lesson.</p>
            ) : (
              <div className="space-y-3">
                {lesson.linkedTests.map((test) => (
                  <TestView key={test.id} test={test} lessonTitle={lesson.title} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

function ModuleView({ module }: { module: AdminDashboardModule }) {
  const lessonNameById = new Map(module.lessons.map((lesson) => [lesson.id, lesson.title]));
  const moduleLevelTests = module.tests.filter(
    (test) => !module.lessons.some((lesson) => lesson.id === test.after_lesson_id)
  );

  return (
    <details className="group rounded-[1.5rem] border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5">
        <div>
          <h4 className="text-lg font-black tracking-tight text-slate-900">{module.title}</h4>
          <p className="mt-1 text-sm text-slate-500">
            Module {module.order} • {module.lessons.length} lessons • {module.tests.length} tests
          </p>
        </div>
        <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-200 px-5 py-5">
        <div className="space-y-4">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Lessons
            </p>
            {module.lessons.length === 0 ? (
              <p className="text-sm text-slate-500">No lessons in this module.</p>
            ) : (
              <div className="space-y-3">
                {module.lessons.map((lesson) => (
                  <LessonView key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Module tests
            </p>
            {moduleLevelTests.length === 0 ? (
              <p className="text-sm text-slate-500">No standalone module tests.</p>
            ) : (
              <div className="space-y-3">
                {moduleLevelTests.map((test) => (
                  <TestView
                    key={test.id}
                    test={test}
                    lessonTitle={
                      test.after_lesson_id
                        ? lessonNameById.get(test.after_lesson_id) ?? null
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

export function AdminCourseCatalog({ courses }: AdminCourseCatalogProps) {
  return (
    <Card className="rounded-[1.75rem] border-cyan-100 p-0 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Courses</h2>
            
          </div>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
            {courses.length}
          </span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="px-6 py-10 text-sm text-slate-500">No courses found.</div>
      ) : (
        <div className="space-y-4 p-6">
          {courses.map((course) => (
            <details
              key={course.id}
              className="group rounded-[1.5rem] border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black tracking-tight text-slate-900">
                      {course.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                      {course.status}
                    </span>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
                      {course.access_type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {course.teacher?.fullName?.trim() || course.teacher?.email || course.teacher_id}
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>

              <div className="border-t border-slate-100 px-5 py-5">
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetaRow label="Slug" value={course.slug} />
                    <MetaRow
                      label="Teacher"
                      value={
                        course.teacher?.fullName?.trim() ||
                        course.teacher?.email ||
                        course.teacher_id
                      }
                    />
                    <MetaRow label="Created" value={formatDate(course.created_at)} />
                    <MetaRow
                      label="Updated"
                      value={formatDate(course.updated_at)}
                    />
                    <MetaRow label="Modules" value={course.modules.length} />
                    <MetaRow label="Lessons" value={course.totalLessons} />
                    <MetaRow label="Blocks" value={course.totalBlocks} />
                    <MetaRow label="Tests" value={course.totalTests} />
                    <MetaRow label="Questions" value={course.totalQuestions} />
                    <MetaRow label="Answers" value={course.totalAnswers} />
                    <MetaRow
                      label="Published"
                      value={course.is_published ? "Yes" : "No"}
                    />
                    <MetaRow
                      label="Deleted at"
                      value={course.deleted_at ? formatDate(course.deleted_at) : "Active"}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                      Description
                    </p>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      {course.description?.trim() || "No description."}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                      Modules
                    </p>
                    {course.modules.length === 0 ? (
                      <p className="text-sm text-slate-500">No modules in this course.</p>
                    ) : (
                      <div className="space-y-4">
                        {course.modules.map((module) => (
                          <ModuleView key={module.id} module={module} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
