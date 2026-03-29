import { useEffect, useState } from "react";
import type { ExerciseContent } from "../../api";

type ExercisePreviewProps = {
  content: ExerciseContent;
  description?: string | null;
  allowWriteCodeInput?: boolean;
  compact?: boolean;
};

export function ExercisePreview({
  content,
  description = null,
  allowWriteCodeInput = false,
  compact = false,
}: ExercisePreviewProps) {
  const [writeCodeValue, setWriteCodeValue] = useState(
    content.type === "write_code" ? content.initial_code : ""
  );

  useEffect(() => {
    if (content.type === "write_code") {
      setWriteCodeValue(content.initial_code);
    }
  }, [content]);

  if (content.type === "drag_drop_code") {
    const templateParts = content.code_template.split("___");
    const tokens = content.tokens.map((token) => token.trim()).filter(Boolean);
    const correctAnswer = content.correct_answer.map((token) => token.trim()).filter(Boolean);

    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Question
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {content.question || "Add a prompt to preview the exercise."}
          </p>
        </div>

        {description?.trim() ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500">
            {description.trim()}
          </p>
        ) : null}

        <div className="rounded-[1.25rem] border border-slate-200 bg-[#0f172a] p-4 text-sm text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono leading-7">
            {templateParts.map((part, index) => (
              <span key={`${part}-${index}`}>
                {part}
                {index < templateParts.length - 1 ? (
                  <span className="mx-1 inline-flex min-w-[4.5rem] items-center justify-center rounded-md border border-dashed border-[#22d3ee]/50 bg-[#164e63]/55 px-2 py-1 text-xs font-semibold text-[#67e8f9]">
                    blank
                  </span>
                ) : null}
              </span>
            ))}
          </pre>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Tokens
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tokens.length > 0 ? (
              tokens.map((token, index) => (
                <span
                  key={`${token}-${index}`}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                >
                  {token}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">Add tokens to preview them here.</span>
            )}
          </div>
        </div>

        {!compact ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Correct Sequence
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {correctAnswer.length > 0 ? (
                correctAnswer.map((token, index) => (
                  <span
                    key={`${token}-${index}`}
                    className="rounded-full bg-[#14213d] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {`${index + 1}. ${token}`}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">
                  Choose the correct token order to preview it here.
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Question
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {content.question || "Add a prompt to preview the exercise."}
        </p>
      </div>

      {description?.trim() ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500">
          {description.trim()}
        </p>
      ) : null}

      <div className="rounded-[1.25rem] border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Coding Area
        </p>
        <textarea
          value={writeCodeValue}
          onChange={(event) => setWriteCodeValue(event.target.value)}
          readOnly={!allowWriteCodeInput}
          className="mt-3 min-h-[12rem] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-700 outline-none transition focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10"
        />
      </div>

      {!compact ? (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Expected Answer
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100">
            {content.expected_answer || "// Add the expected answer to preview it here."}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
