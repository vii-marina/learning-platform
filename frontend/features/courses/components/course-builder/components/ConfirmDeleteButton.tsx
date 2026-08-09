import { useConfirmDialog } from "../../../../../components/ui/confirmDialogContext";

type ConfirmDeleteButtonProps = {
  label?: string;
  className?: string;
  onConfirm: () => void;
  confirmText?: string;
};

export function ConfirmDeleteButton({
  label = "Видалити",
  className,
  onConfirm,
  confirmText = "Видалити цей елемент?",
}: ConfirmDeleteButtonProps) {
  const { confirm } = useConfirmDialog();

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const isConfirmed = await confirm({
          title: confirmText,
          description: "Цю дію не можна скасувати.",
          confirmLabel: "Видалити",
          tone: "danger",
        });

        if (isConfirmed) {
          onConfirm();
        }
      }}
    >
      {label}
    </button>
  );
}
