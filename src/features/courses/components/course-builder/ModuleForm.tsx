import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";

type ModuleFormProps = {
  title: string;
  disabled: boolean;
  onTitleChange: (value: string) => void;
  onCreate: () => void;
};

export function ModuleForm({
  title,
  disabled,
  onTitleChange,
  onCreate,
}: ModuleFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Module title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={disabled}
      />
      <Button onClick={onCreate} disabled={disabled}>
        Add module
      </Button>
    </div>
  );
}
