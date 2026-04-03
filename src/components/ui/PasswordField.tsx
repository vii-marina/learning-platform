import { useState } from "react";
import { Input } from "./input";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function PasswordField({ label, value, onChange, error }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="text-sm text-slate-600">
      {label}
      <div className="relative mt-1">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Create a password"
          className="pr-10"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {showPassword ? (
              <>
                <path
                  d="M3 3l18 18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.8 10.8a2.5 2.5 0 003.5 3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.6 6.6C4.2 8.2 2.5 10.4 2 12c1.6 4.5 6.1 7 10 7 1.9 0 3.9-.5 5.7-1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              <>
                <path
                  d="M2 12c1.6-4.5 6.1-7 10-7s8.4 2.5 10 7c-1.6 4.5-6.1 7-10 7s-8.4-2.5-10-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Minimum 6 characters</p>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
