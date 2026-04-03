import type { CoursePreviewMode } from "./coursePreviewUtils";

type CoursePreviewModeSwitchProps = {
  value: CoursePreviewMode;
  onChange: (mode: CoursePreviewMode) => void;
};

const modeOptions: Array<{
  value: CoursePreviewMode;
  label: string;
}> = [
  {
    value: "student",
    label: "Student",
  },
  {
    value: "teacher",
    label: "Teacher",
  },
];

export function CoursePreviewModeSwitch({
  value,
  onChange,
}: CoursePreviewModeSwitchProps) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      {modeOptions.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-[#13daec] text-[#0f172a]"
                : "text-slate-500 hover:bg-slate-100 hover:text-[#0f172a]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
