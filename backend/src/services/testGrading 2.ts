// Pure server-side test grading (R15). Kept free of Supabase/env imports so the
// scoring rule is unit-testable in isolation; `studentDashboardCoursesService`
// fetches the rows and delegates the scoring here.
//
// Mirrors the client's scoring rule exactly (CoursePreviewTestModal /
// CoursePreviewLessonContent) so a submission grades identically:
//   - option index order = answers sorted by created_at asc (same as the
//     student-details endpoint that rendered the options);
//   - true_false → [0] for the correct "true" answer, [1] for "false";
//   - a question is correct iff the selected index set equals the correct set.

export type GradingQuestionRow = { id: string; type: string };
export type GradingAnswerRow = {
  question_id: string;
  answer_text: string;
  is_correct: boolean;
};

export type TestGradeResult = {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  perQuestion: Record<string, boolean>;
};

// Both languages are recognized: answers are stored as «Правда/Неправда» today,
// but legacy rows carry the English literals (R18).
const FALSE_ANSWER_LABELS = new Set(["false", "неправда"]);

export const TEST_PASS_THRESHOLD = 70;

export function computeCorrectIndexes(type: string, answers: GradingAnswerRow[]): number[] {
  if (type === "true_false") {
    const correctAnswer = answers.find((answer) => answer.is_correct);
    if (!correctAnswer) {
      return [];
    }
    return FALSE_ANSWER_LABELS.has(correctAnswer.answer_text.trim().toLowerCase())
      ? [1]
      : [0];
  }

  return answers.reduce<number[]>((indexes, answer, index) => {
    if (answer.is_correct) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

export function isQuestionAnsweredCorrectly(
  correctIndexes: number[],
  selectedRaw: number[]
): boolean {
  const selected = Array.from(new Set(selectedRaw));
  return (
    selected.length === correctIndexes.length &&
    selected.every((index) => correctIndexes.includes(index))
  );
}

export function scoreSubmission(
  questionRows: GradingQuestionRow[],
  answersByQuestionId: Map<string, GradingAnswerRow[]>,
  submittedAnswers: Record<string, number[]>
): TestGradeResult {
  if (questionRows.length === 0) {
    return { scorePercent: 0, correctCount: 0, totalQuestions: 0, perQuestion: {} };
  }

  const perQuestion: Record<string, boolean> = {};
  let correctCount = 0;
  for (const question of questionRows) {
    const correctIndexes = computeCorrectIndexes(
      question.type,
      answersByQuestionId.get(question.id) ?? []
    );
    const selected = submittedAnswers[question.id] ?? [];
    const isCorrect = isQuestionAnsweredCorrectly(correctIndexes, selected);
    perQuestion[question.id] = isCorrect;
    if (isCorrect) {
      correctCount += 1;
    }
  }

  return {
    scorePercent: Math.round((correctCount / questionRows.length) * 100),
    correctCount,
    totalQuestions: questionRows.length,
    perQuestion,
  };
}

export function isPassingScore(scorePercent: number): boolean {
  return scorePercent >= TEST_PASS_THRESHOLD;
}

export function groupAnswersByQuestionId(
  answers: GradingAnswerRow[]
): Map<string, GradingAnswerRow[]> {
  const answersByQuestionId = new Map<string, GradingAnswerRow[]>();
  for (const answer of answers) {
    const list = answersByQuestionId.get(answer.question_id) ?? [];
    list.push(answer);
    answersByQuestionId.set(answer.question_id, list);
  }
  return answersByQuestionId;
}
