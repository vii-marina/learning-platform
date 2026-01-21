import { Button } from "../ui/button";
import { Input } from "../ui/input";

type CourseFormProps = {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreate: () => void;
};

export function CourseForm({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onCreate,
}: CourseFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Course title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />
      <Input
        placeholder="Course description"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
      <Button onClick={onCreate}>Add course</Button>
    </div>
  );
}
