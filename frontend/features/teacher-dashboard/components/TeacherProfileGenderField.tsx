/**
 * The gender selector on the teacher profile.
 *
 * Three buttons rather than a `<select>`: it is a short fixed set, and the icons carry the
 * meaning as well as the label does.
 */

import { Mars, Venus, VenusAndMars } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FieldLabel, FieldShell } from "../../profile/ProfileFormControls";
import type { TeacherProfileGender } from "../../auth/types";

export function GenderField({
  value,
  onChange,
}: {
  value: TeacherProfileGender | "";
  onChange: (value: TeacherProfileGender | "") => void;
}) {
  const options: Array<{
    value: TeacherProfileGender;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "male", label: "Чоловік", icon: Mars },
    { value: "female", label: "Жінка", icon: Venus },
    { value: "other", label: "Інше", icon: VenusAndMars },
  ];

  return (
    <FieldShell>
      <FieldLabel label="Стать" required />
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                isActive
                  ? "border-[#13daec] bg-[#13daec]/10 text-[#0f172a]"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}
