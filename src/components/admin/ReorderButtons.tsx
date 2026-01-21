type ReorderButtonsProps = {
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function ReorderButtons({ onMoveUp, onMoveDown }: ReorderButtonsProps) {
  return (
    <>
      <button type="button" onClick={onMoveUp}>
        Up
      </button>
      <button type="button" onClick={onMoveDown}>
        Down
      </button>
    </>
  );
}
