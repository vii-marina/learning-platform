/**
 * Retry and concurrency policy around the AI generators.
 *
 * Only *quality* failures are retried here. Transport errors are already retried by the
 * OpenAI SDK with backoff, so retrying them again would multiply the wait and the bill.
 */

import { logger } from "../../lib/logger";
import {
  generateExerciseFromLesson,
  type ExerciseDifficulty,
  type GeneratedExerciseType,
} from "../../services/aiExerciseGenerator";
import {
  generateQuestionsFromLesson,
  type AiQuestionGenerationMode,
  type GeneratedQuestion,
} from "../../services/aiQuestionGenerator";
import { AiQualityError } from "../../services/aiShared";

// Accumulates unique questions across attempts instead of discarding whole
// batches, so a partial shortfall tops up rather than starting over.
// Only quality failures are retried — the OpenAI SDK already retries
// transport errors with backoff, so those fail fast (or return a partial pool).
export async function generateQuestionsWithRetry(
  text: string,
  questionCount: number,
  mode: AiQuestionGenerationMode
): Promise<GeneratedQuestion[]> {
  const MAX_ATTEMPTS = 3;
  const pool: GeneratedQuestion[] = [];
  const seenTexts = new Set<string>();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && pool.length < questionCount; attempt++) {
    try {
      logger.debug("Generating questions", {
        attempt,
        have: pool.length,
        want: questionCount,
      });

      const batch = await generateQuestionsFromLesson(text, questionCount, mode);

      for (const question of batch) {
        const key = question.question_text.trim().toLowerCase();

        if (seenTexts.has(key)) {
          continue;
        }

        seenTexts.add(key);
        pool.push(question);
      }
    } catch (err) {
      if (err instanceof AiQualityError) {
        logger.warn("AI question quality failure, retrying", {
          attempt,
          detail: err.message,
        });
        continue;
      }

      if (pool.length > 0) {
        logger.error("Transport error after partial question generation, returning partial", {
          attempt,
          generated: pool.length,
          want: questionCount,
          error: err,
        });
        break;
      }

      throw err;
    }
  }

  if (pool.length === 0) {
    throw new Error("AI failed to generate valid questions after retries");
  }

  return pool.slice(0, questionCount);
}

export async function generateExerciseWithRetry(
  text: string,
  type: GeneratedExerciseType,
  difficulty: ExerciseDifficulty
) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.debug("Generating exercise", { difficulty, attempt });

      const exercise = await generateExerciseFromLesson(
        text,
        type,
        difficulty
      );

      if (exercise.question.length > 10) {
        return exercise;
      }

      logger.warn("AI returned a too-short exercise question, retrying", {
        difficulty,
        attempt,
      });
    } catch (err) {
      // Transport/API errors were already retried by the SDK — fail fast.
      if (!(err instanceof AiQualityError)) {
        throw err;
      }

      logger.warn("AI exercise quality failure, retrying", {
        difficulty,
        attempt,
        detail: err.message,
      });
    }
  }

  throw new Error("AI failed to generate valid exercise after retries");
}

export const AI_EXERCISE_CONCURRENCY = 3;

// Bounded-concurrency map; a failed item resolves to null instead of
// rejecting the whole batch, so one bad generation doesn't waste the rest.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<Array<R | null>> {
  const results: Array<R | null> = new Array(items.length).fill(null);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;

        try {
          results[index] = await fn(items[index], index);
        } catch (err) {
          // Deliberately swallowed: the batch tolerates partial failure and the caller
          // sees a null slot. Logged so the failure is not invisible.
          logger.error("AI generation job failed", { index, error: err });
        }
      }
    }
  );

  await Promise.all(workers);

  return results;
}
