import {
  archiveCourse,
  createCourse,
  createLesson,
  createLessonBlock,
  createModule,
  createTestAnswer,
  createTestEntity,
  createTestQuestion,
  deleteCourse,
  deleteLesson,
  deleteLessonBlock,
  deleteModule,
  deleteTestAnswer,
  deleteTestEntity,
  deleteTestQuestion,
  getCourseById,
  listLessonBlocksByLesson,
  listLessonsByModule,
  listModulesByCourse,
  listTestAnswers,
  listTestQuestions,
  listTestsByModule,
  updateCourse,
  updateLesson,
  updateLessonBlock,
  updateModule,
  updateTestAnswer,
  updateTestEntity,
  updateTestQuestion,
} from "./courseBuilderApi";

// Examples for `courses` CRUD.
export async function exampleCourseCrud(teacherId: string) {
  const created = await createCourse({
    teacher_id: teacherId,
    title: "Intro to TypeScript",
    description: "Practical TypeScript course",
  });

  const read = await getCourseById(created.id);

  const updated = await updateCourse(created.id, {
    title: "Intro to TypeScript (Updated)",
    description: "Updated description",
  });

  await archiveCourse(created.id);
  await deleteCourse(created.id);

  return { created, read, updated };
}

// Examples for `modules` CRUD.
export async function exampleModuleCrud(courseId: string) {
  const created = await createModule({
    course_id: courseId,
    title: "Module 1",
  });

  const read = await listModulesByCourse(courseId);

  const updated = await updateModule(created.id, {
    title: "Module 1 (Updated)",
  });

  await deleteModule(created.id);

  return { created, read, updated };
}

// Examples for `lessons` CRUD.
export async function exampleLessonCrud(moduleId: string) {
  const created = await createLesson({
    module_id: moduleId,
    title: "Lesson 1",
    content: "<p>Hello lesson</p>",
    content_type: "html",
  });

  const read = await listLessonsByModule(moduleId);

  const updated = await updateLesson(created.id, {
    title: "Lesson 1 (Updated)",
    content: "<p>Updated lesson</p>",
  });

  await deleteLesson(created.id);

  return { created, read, updated };
}

// Examples for `lesson_blocks` CRUD.
export async function exampleLessonBlockCrud(lessonId: string) {
  const created = await createLessonBlock({
    lesson_id: lessonId,
    block_type: "rich_text",
    content: { html: "<p>Block content</p>" },
  });

  const read = await listLessonBlocksByLesson(lessonId);

  const updated = await updateLessonBlock(created.id, {
    content: { html: "<p>Updated block</p>" },
  });

  await deleteLessonBlock(created.id);

  return { created, read, updated };
}

// Examples for optional tests (`test_entities`, `test_questions`, `test_answers`) CRUD.
export async function exampleTestCrud(moduleId: string) {
  const createdTest = await createTestEntity({
    module_id: moduleId,
    passing_percentage: 70,
  });

  const createdQuestion = await createTestQuestion({
    test_id: createdTest.id,
    type: "single_choice",
    question_text: "What is TypeScript?",
  });

  const createdAnswer = await createTestAnswer({
    question_id: createdQuestion.id,
    answer_text: "A typed superset of JavaScript",
    is_correct: true,
  });

  const tests = await listTestsByModule(moduleId);
  const questions = await listTestQuestions(createdTest.id);
  const answers = await listTestAnswers(createdQuestion.id);

  const updatedTest = await updateTestEntity(createdTest.id, {
    passing_percentage: 80,
  });

  const updatedQuestion = await updateTestQuestion(createdQuestion.id, {
    question_text: "TypeScript is:",
  });

  const updatedAnswer = await updateTestAnswer(createdAnswer.id, {
    answer_text: "Strongly typed JS superset",
  });

  await deleteTestAnswer(createdAnswer.id);
  await deleteTestQuestion(createdQuestion.id);
  await deleteTestEntity(createdTest.id);

  return {
    tests,
    questions,
    answers,
    updatedTest,
    updatedQuestion,
    updatedAnswer,
  };
}
