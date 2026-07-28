import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Modal } from "../../../../../components/ui/Modal";

type CreateModuleModalProps = {
  isOpen: boolean;
  title: string;
  isSaving?: boolean;
  onTitleChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function CreateModuleModal({
  isOpen,
  title,
  isSaving = false,
  onTitleChange,
  onCancel,
  onSave,
}: CreateModuleModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      dismissDisabled={isSaving}
      ariaLabel={title.trim() ? "Редагувати модуль" : "Створити модуль"}
      panelClassName="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
    >
        <p className="text-sm font-semibold text-slate-400">
          Course content
        </p>
        <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[#14213d]">
          {title.trim() ? "Редагувати модуль" : "Створити модуль"}
        </h3>

        <div className="mt-6">
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Новий модуль"
            autoFocus
            className="h-14 rounded-2xl border border-slate-200 bg-[#f9fbfd] px-5 text-lg font-medium text-[#14213d] focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            className="h-12 min-w-36 rounded-2xl border border-slate-200 bg-white text-base font-semibold text-slate-600 hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-12 min-w-36 rounded-2xl bg-[#13daec] text-base font-bold text-[#0f172a] hover:bg-[#10c6d7]"
            onClick={onSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
    </Modal>
  );
}
