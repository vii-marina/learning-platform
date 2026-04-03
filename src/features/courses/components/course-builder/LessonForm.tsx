import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

type LessonFormProps = {
  title: string;
  content: string;
  contentType: string;
  disabled: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onCreate: () => void;
};

export function LessonForm({
  title,
  content,
  contentType,
  disabled,
  onTitleChange,
  onContentChange,
  onContentTypeChange,
  onCreate,
}: LessonFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Lesson title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={disabled}
      />
      <Input
        placeholder="Lesson content"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        disabled={disabled}
      />
      <Input
        placeholder="Content type"
        value={contentType}
        onChange={(event) => onContentTypeChange(event.target.value)}
        disabled={disabled}
      />
      <Button onClick={onCreate} disabled={disabled}>
        Add lesson
      </Button>
    </div>
  );
}
