type ConfirmDeleteButtonProps = {
  label?: string;
  className?: string;
  onConfirm: () => void;
  confirmText?: string;
};

export function ConfirmDeleteButton({
  label = "Delete",
  className,
  onConfirm,
  confirmText = "Delete this item?",
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
