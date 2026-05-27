import type { AiQuestionGenerationMode, TestQuestionType } from "../../../api/index";

export const testQuestionTypeOptions: Array<{
  value: TestQuestionType;
  label: string;
}> = [
  { value: "true_false", label: "Правда/Неправда" },
  { value: "single_choice", label: "Один варіант" },
  { value: "multiple_choice", label: "Кілька варіантів" },
];

export const aiQuestionGenerationModeOptions: Array<{
  value: AiQuestionGenerationMode;
  label: string;
}> = [
  ...testQuestionTypeOptions,
  { value: "mixed", label: "Змішаний" },
];
