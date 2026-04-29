import type { AiQuestionGenerationMode, TestQuestionType } from "../../../api/index";

export const testQuestionTypeOptions: Array<{
  value: TestQuestionType;
  label: string;
}> = [
  { value: "true_false", label: "True/False" },
  { value: "single_choice", label: "Multiple Choice (Single)" },
  { value: "multiple_choice", label: "Multiple Choice (Multiple)" },
];

export const aiQuestionGenerationModeOptions: Array<{
  value: AiQuestionGenerationMode;
  label: string;
}> = [
  ...testQuestionTypeOptions,
  { value: "mixed", label: "Mixed" },
];
