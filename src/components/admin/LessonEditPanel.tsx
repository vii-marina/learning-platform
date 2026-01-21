import { Button } from "../ui/button";
import { Input } from "../ui/input";

type LessonEditPanelProps = {
  title: string;
  content: string;
  contentType: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function LessonEditPanel({
  title,
  content,
  contentType,
  onTitleChange,
  onContentChange,
  onContentTypeChange,
  onSave,
  onCancel,
}: LessonEditPanelProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
      <Input
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
      />
      <Input
        value={contentType}
        onChange={(event) => onContentTypeChange(event.target.value)}
      />
      <div className="flex gap-2">
        <Button onClick={onSave}>Save</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
