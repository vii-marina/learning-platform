import { Button } from "../ui/button";
import { Input } from "../ui/input";

type CourseEditPanelProps = {
  title: string;
  description: string;
  isPublished: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPublishedChange: (value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function CourseEditPanel({
  title,
  description,
  isPublished,
  onTitleChange,
  onDescriptionChange,
  onPublishedChange,
  onSave,
  onCancel,
}: CourseEditPanelProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
      <Input
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => onPublishedChange(event.target.checked)}
        />
        Published
      </label>
      <div className="flex gap-2">
        <Button onClick={onSave}>Save</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
