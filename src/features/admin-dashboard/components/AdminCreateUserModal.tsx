import { LoaderCircle, UserPlus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { PasswordField } from "../../../components/ui/PasswordField";
import { getErrorMessage } from "../../auth/api/backendClient";
import type { PublicRegistrationRole } from "../../auth/types";

type AdminCreateUserModalProps = {
  role: PublicRegistrationRole;
  onClose: () => void;
  onSubmit: (input: {
    email: string;
    fullName: string;
    password: string;
    role: PublicRegistrationRole;
  }) => Promise<void>;
};

function getRoleLabels(role: PublicRegistrationRole) {
  return role === "teacher"
    ? {
        title: "Add Teacher",
        subtitle: "Create a new teacher account for the platform.",
        submitLabel: "Create Teacher",
      }
    : {
        title: "Add Student",
        subtitle: "Create a new student account for the platform.",
        submitLabel: "Create Student",
      };
}

export function AdminCreateUserModal({
  role,
  onClose,
  onSubmit,
}: AdminCreateUserModalProps) {
  const labels = getRoleLabels(role);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedFullName) {
      setMessage("Please enter a full name.");
      return;
    }

    if (!normalizedEmail) {
      setMessage("Please enter an email address.");
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setPasswordError("");

    try {
      await onSubmit({
        email: normalizedEmail,
        fullName: trimmedFullName,
        password,
        role,
      });
      onClose();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to create user."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-xl items-center justify-center">
        <div className="w-full rounded-[1.75rem] border border-cyan-100 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.22)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-700">{labels.title}</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#14213d]">
                  Create account
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {labels.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close create user modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {message ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {message}
              </div>
            ) : null}

            <label className="block text-sm text-slate-600">
              <span>Full Name</span>
              <Input
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  if (message) {
                    setMessage("");
                  }
                }}
                placeholder="Enter full name"
                className="mt-1"
                disabled={isSubmitting}
              />
            </label>

            <label className="block text-sm text-slate-600">
              <span>Email</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (message) {
                    setMessage("");
                  }
                }}
                placeholder="name@example.com"
                className="mt-1"
                disabled={isSubmitting}
              />
            </label>

            <PasswordField
              label="Temporary Password"
              value={password}
              onChange={(nextValue) => {
                setPassword(nextValue);
                if (passwordError) {
                  setPasswordError("");
                }
                if (message) {
                  setMessage("");
                }
              }}
              error={passwordError}
            />

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>{labels.submitLabel}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
