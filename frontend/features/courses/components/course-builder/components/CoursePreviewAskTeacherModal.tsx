import { useId, useState } from "react";
import {  X } from "lucide-react";
import { Modal } from "../../../../../components/ui/Modal";
import { Button } from "../../../../../components/ui/button";

export type CoursePreviewChatContext = {
  reference: string;
  title: string;
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
  onClose,
  onSend,
}: CoursePreviewAskTeacherModalProps) {
  const headingId = useId();
  const [draft, setDraft] = useState("");
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);

  // Clear the draft when the modal (re)opens or its reference changes.
  const openKey = isOpen ? context?.reference ?? "" : null;
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey !== null) {
      setDraft("");
    }
  }

  if (!isOpen || !context) {
    return null;
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledById={headingId}
      closeOnOverlayClick
      overlayClassName="z-[130]"
      panelClassName="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
            <div className="space-y-2">
            
              <div>
                <h2 id={headingId} className="text-xl font-semibold tracking-tight text-slate-950">
                  {context.title}
                </h2>
                
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-15 px-0"
              aria-label="Закрити модальне вікно запитання викладачу"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="border-b border-slate-200 bg-[#f8fafc] px-5 py-4">
            
            <p className="mt-2 text-sm font-medium text-[#0f172a]">{context.reference}</p>
          </div>

          

          <div className="border-t border-slate-200 px-5 py-5">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Опишіть, де виникла складність або що незрозуміло."
              className="min-h-[8rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/10"
            />

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              

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
    </Modal>
  );
}
