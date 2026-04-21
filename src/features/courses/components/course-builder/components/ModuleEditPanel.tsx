import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";

type ModuleEditPanelProps = {
  title: string;
  onTitleChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function ModuleEditPanel({
  title,
  onTitleChange,
  onSave,
  onCancel,
}: ModuleEditPanelProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
      <div className="flex gap-2">
        <Button onClick={onSave}>Save</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
