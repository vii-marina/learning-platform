/**
 * The field controls both profile forms are built from.
 *
 * The teacher and student forms had byte-identical copies of these, except that the
 * teacher's `TextField` also accepted `type="number"` and a `min` — the version kept here
 * is that superset, so neither form loses anything.
 *
 * `FieldShell` is what ties the visible label to the control via `htmlFor`/`id`: without it
 * a screen reader announces an unlabelled text box.
 */

import type { ReactNode } from "react";
import { getFieldFrameClasses, type FieldStatus } from "./profileFormFields";

export function FieldLabel({
  label,
  required,
}: {
  label: string;
  required: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <span
        className={`text-xs font-medium ${
          required ? "text-[#0891a4]" : "text-slate-400"
        }`}
      >
        {required ? "Обовʼязково" : "Необовʼязково"}
      </span>
    </div>
  );
}

export function FieldShell({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="space-y-2">{children}</div>;
}

export function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  status,
  type = "text",
  min,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  status: FieldStatus;
  type?: "text" | "url" | "number" | "date" | "email";
  min?: number;
}) {
  return (
    <FieldShell>
      <FieldLabel label={label} required={required} />
      <div
        className={`rounded-xl border transition focus-within:border-[#13daec] focus-within:ring-4 focus-within:ring-[#13daec]/12 ${getFieldFrameClasses(status)}`}
      >
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          min={min}
          aria-invalid={status === "invalid"}
          className="h-11 w-full rounded-xl bg-transparent px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  required,
  value,
  onChange,
  placeholder,
  status,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  status: FieldStatus;
}) {
  return (
    <FieldShell>
      <FieldLabel label={label} required={required} />
      <div
        className={`rounded-xl border transition focus-within:border-[#13daec] focus-within:ring-4 focus-within:ring-[#13daec]/12 ${getFieldFrameClasses(status)}`}
      >
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={status === "invalid"}
          className="min-h-[7rem] w-full resize-y rounded-xl bg-transparent px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </FieldShell>
  );
}
