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
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.confirm(confirmText)) {
          onConfirm();
        }
      }}
    >
      {label}
    </button>
  );
}
