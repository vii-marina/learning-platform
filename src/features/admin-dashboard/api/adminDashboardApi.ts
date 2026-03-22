import { supabase } from "../../../lib/supabase";
import {
  listAdminUsers,
  listStudents,
  listTeachers,
} from "../../auth/api/authApi";
import type { CurrentUser } from "../../auth/types";
import {
  listLessonBlocksByLesson,
  listLessonsByModule,
  listModulesByCourse,
  listTestAnswers,
  listTestQuestions,
  listTestsByModule,
  type Course,
  type Module,
  type TestEntity,
} from "../../courses/api";
import type {
  AdminDashboardCourse,
  AdminDashboardModule,
  AdminDashboardOverviewData,
  AdminDashboardSettingsData,
  AdminDashboardTest,
} from "../types";

type CountedTable =
  | "courses"
  | "modules"
  | "lessons"
  | "lesson_blocks"
  | "test_entities"
  | "test_questions"
  | "test_answers";

function toErrorMessage(scope: string, details: string) {
  return `${scope}: ${details}`;
}

async function countTableRows(table: CountedTable) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(toErrorMessage(`Unable to count ${table}`, error.message));
  }

  return count ?? 0;
}

async function listAdminCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(toErrorMessage("Unable to list courses", error.message));
  }

  return (data ?? []) as Course[];
}

function buildUserMap(users: CurrentUser[]) {
  return new Map(users.map((user) => [user.id, user]));
}

async function hydrateTest(testEntity: TestEntity): Promise<AdminDashboardTest> {
  const questions = await listTestQuestions(testEntity.id);
  const questionsWithAnswers = await Promise.all(
    questions.map(async (question) => ({
      ...question,
      answers: await listTestAnswers(question.id),
    }))
  );

  return {
    ...testEntity,
    questions: questionsWithAnswers,
  };
}

async function hydrateModule(module: Module): Promise<AdminDashboardModule> {
  const [lessons, testEntities] = await Promise.all([
    listLessonsByModule(module.id),
    listTestsByModule(module.id),
  ]);
  const tests = await Promise.all(testEntities.map(hydrateTest));
  const testsByLessonId = new Map<string, AdminDashboardTest[]>();

  for (const test of tests) {
    if (!test.after_lesson_id) {
      continue;
    }

    const lessonTests = testsByLessonId.get(test.after_lesson_id) ?? [];
    lessonTests.push(test);
    testsByLessonId.set(test.after_lesson_id, lessonTests);
  }

  const hydratedLessons = await Promise.all(
    lessons.map(async (lesson) => ({
      ...lesson,
      blocks: await listLessonBlocksByLesson(lesson.id),
      linkedTests: testsByLessonId.get(lesson.id) ?? [],
    }))
  );

  return {
    ...module,
    lessons: hydratedLessons,
    tests,
  };
}

function computeCourseTotals(modules: AdminDashboardModule[]) {
  return modules.reduce(
    (totals, module) => {
      totals.lessons += module.lessons.length;
      totals.blocks += module.lessons.reduce((sum, lesson) => sum + lesson.blocks.length, 0);
      totals.tests += module.tests.length;
      totals.questions += module.tests.reduce(
        (sum, test) => sum + test.questions.length,
        0
      );
      totals.answers += module.tests.reduce(
        (sum, test) =>
          sum +
          test.questions.reduce(
            (questionSum, question) => questionSum + question.answers.length,
            0
          ),
        0
      );

      return totals;
    },
    {
      lessons: 0,
      blocks: 0,
      tests: 0,
      questions: 0,
      answers: 0,
    }
  );
}

async function hydrateCourse(course: Course, userById: Map<string, CurrentUser>) {
  const modules = await listModulesByCourse(course.id);
  const hydratedModules = await Promise.all(modules.map(hydrateModule));
  const courseTotals = computeCourseTotals(hydratedModules);

  return {
    ...course,
    teacher: userById.get(course.teacher_id) ?? null,
    modules: hydratedModules,
    totalLessons: courseTotals.lessons,
    totalBlocks: courseTotals.blocks,
    totalTests: courseTotals.tests,
    totalQuestions: courseTotals.questions,
    totalAnswers: courseTotals.answers,
  } satisfies AdminDashboardCourse;
}

export async function loadAdminOverviewData(): Promise<AdminDashboardOverviewData> {
  const [users, teachers, students, courses, modules, lessons, blocks, tests, questions, answers] =
    await Promise.all([
      listAdminUsers(),
      listTeachers(),
      listStudents(),
      countTableRows("courses"),
      countTableRows("modules"),
      countTableRows("lessons"),
      countTableRows("lesson_blocks"),
      countTableRows("test_entities"),
      countTableRows("test_questions"),
      countTableRows("test_answers"),
    ]);

  return {
    totals: {
      users: users.length,
      teachers: teachers.length,
      students: students.length,
      courses,
      modules,
      lessons,
      blocks,
      tests,
      questions,
      answers,
    },
  };
}

export async function loadAdminTeachersData() {
  return listTeachers();
}

export async function loadAdminStudentsData() {
  return listStudents();
}

export async function loadAdminCoursesData(): Promise<AdminDashboardCourse[]> {
  const [users, courses] = await Promise.all([listAdminUsers(), listAdminCourses()]);
  const userById = buildUserMap(users);

  return Promise.all(courses.map((course) => hydrateCourse(course, userById)));
}

export async function loadAdminSettingsData(): Promise<AdminDashboardSettingsData> {
  const users = await listAdminUsers();

  return {
    users,
  };
}
