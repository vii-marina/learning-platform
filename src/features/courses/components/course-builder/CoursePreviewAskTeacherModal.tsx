import { useEffect, useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";

export type CoursePreviewChatContext = {
  reference: string;
  title: string;
  description: string;
};

export type CoursePreviewChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type CoursePreviewAskTeacherModalProps = {
  isOpen: boolean;
  context: CoursePreviewChatContext | null;
  messages: CoursePreviewChatMessage[];
  onClose: () => void;
  onSend: (message: string) => void;
};

export function CoursePreviewAskTeacherModal({
  isOpen,
  context,
  messages,
  onClose,
  onSend,
}: CoursePreviewAskTeacherModalProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraft("");
  }, [context?.reference, isOpen]);

  if (!isOpen || !context) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <MessageSquareText className="h-3.5 w-3.5" />
                <span>Ask Teacher</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {context.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {context.description}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-10 px-0"
              aria-label="Close ask teacher modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b border-slate-200 bg-[#f8fafc] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Context
            </p>
            <p className="mt-2 text-sm font-medium text-[#0f172a]">{context.reference}</p>
          </div>

          <div className="max-h-[18rem] min-h-[12rem] overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Start the conversation. The lesson or test reference will be included with your
                message.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "border border-slate-200 bg-white text-slate-700"
                        : "bg-[#f8fafc] text-slate-500"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-5 py-5">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Describe where you are stuck or what feels unclear."
              className="min-h-[8rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/10"
            />

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Your question will include the current lesson or test reference.
              </p>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    const nextMessage = draft.trim();

                    if (!nextMessage) {
                      return;
                    }

                    onSend(nextMessage);
                    setDraft("");
                  }}
                  disabled={!draft.trim()}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
