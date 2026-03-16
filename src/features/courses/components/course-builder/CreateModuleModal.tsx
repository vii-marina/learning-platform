import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";

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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
        <h3 className="text-2xl font-semibold text-slate-900">Edit Module</h3>

        <div className="mt-8">
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="New Module"
            autoFocus
            className="h-14 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-lg font-medium"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="secondary"
            className="h-12 min-w-36 rounded-2xl border-slate-300 bg-white text-lg font-semibold text-slate-900"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-12 min-w-36 rounded-2xl text-lg font-semibold"
            onClick={onSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
