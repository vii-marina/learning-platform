import type { Module } from "../types/types";
import { ModuleEditPanel } from "./ModuleEditPanel";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { ReorderButtons } from "./ReorderButtons";

type ModuleListProps = {
  modules: Module[];
  selectedModuleId: string | null;
  editModuleId: string | null;
  editTitle: string;
  onSelect: (moduleId: string) => void;
  onEditStart: (module: Module) => void;
  onDelete: (moduleId: string) => void;
  onMoveUp: (moduleId: string) => void;
  onMoveDown: (moduleId: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
};

export function ModuleList({
  modules,
  selectedModuleId,
  editModuleId,
  editTitle,
  onSelect,
  onEditStart,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEditTitleChange,
  onEditSave,
  onEditCancel,
}: ModuleListProps) {
  return (
    <div className="flex flex-col gap-2">
      {modules.map((module) => (
        <div
          key={module.id}
          className={`rounded border px-3 py-2 text-sm ${
            selectedModuleId === module.id
              ? "border-slate-900 text-slate-900"
              : "border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelect(module.id)}
              className="text-left font-medium"
            >
              {module.title}
            </button>
            <div className="flex gap-2 text-xs text-slate-500">
              <ReorderButtons
                onMoveUp={() => onMoveUp(module.id)}
                onMoveDown={() => onMoveDown(module.id)}
              />
              <button
                type="button"
                onClick={() => onEditStart(module)}
              >
                Edit
              </button>
              <ConfirmDeleteButton
                className="text-xs text-slate-500"
                confirmText="Delete this module?"
                onConfirm={() => onDelete(module.id)}
              />
            </div>
          </div>
          {editModuleId === module.id ? (
            <ModuleEditPanel
              title={editTitle}
              onTitleChange={onEditTitleChange}
              onSave={onEditSave}
              onCancel={onEditCancel}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
