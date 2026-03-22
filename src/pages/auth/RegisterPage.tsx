import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  School,
  SquareUserRound,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { registerProfile } from "../../features/auth/api/authApi";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import { clearPendingRegistration, savePendingRegistration } from "../../features/auth/lib/pendingRegistration";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";
import type { PublicRegistrationRole } from "../../features/auth/types";

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<PublicRegistrationRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info" | "success">(
    "info"
  );
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (password.length >= 6 && passwordError) {
      setPasswordError("");
    }
  }, [password, passwordError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedFullName) {
      setMessage("Please enter your full name.");
      setMessageType("error");
      return;
    }

    if (password.length < 6) {
      setPasswordError(
        "Your password is too short. Please use at least 6 characters."
      );
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setPasswordError("");
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const messageText = error.message.toLowerCase();
        const isAlreadyRegistered =
          messageText.includes("already") || messageText.includes("registered");

        if (isAlreadyRegistered) {
          setMessage("This email is already registered. Please sign in.");
          setMessageType("error");
          return;
        }

        setMessage(getErrorMessage(error, "Unable to create your account."));
        setMessageType("error");
        return;
      }

      const identities = data.user?.identities ?? [];

      if (!data.user) {
        setMessage("Unable to create your account right now. Please try again.");
        setMessageType("error");
        return;
      }

      if (data.user && identities.length === 0) {
        setMessage("This email is already registered. Please sign in.");
        setMessageType("error");
        return;
      }

      savePendingRegistration({
        email: normalizedEmail,
        fullName: trimmedFullName,
        role,
      });

      if (data.session?.access_token) {
        const currentUser = await registerProfile({
          fullName: trimmedFullName,
          role,
        });

        clearPendingRegistration();
        navigate(getDefaultRouteForRole(currentUser.role));
        return;
      }

      setPassword("");
      setMessage(
        "Account created. Confirm your email if required, then sign in to finish profile setup."
      );
      setMessageType("info");
    } catch (error) {
      setMessage(
        getErrorMessage(error, "Account created, but profile setup could not be completed.")
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (nextRole: PublicRegistrationRole) => {
    setRole(nextRole);
    if (messageType === "error") {
      setMessage("");
    }
  };

  const handleFullNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(event.target.value);
    if (messageType === "error") {
      setMessage("");
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (messageType === "error") {
      setMessage("");
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (messageType === "error") {
      setMessage("");
    }
  };

  const roleOptionClass = (optionRole: PublicRegistrationRole) =>
    role === optionRole
      ? "border-[#13daec] bg-[#13daec]/10 text-[#0f172a] shadow-[0_10px_24px_rgba(19,218,236,0.14)]"
      : "border-slate-200 bg-white text-[#0f172a] hover:border-[#13daec]/50 hover:bg-[#13daec]/5";

  const feedbackClassName =
    messageType === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : messageType === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-[#13daec]/30 bg-[#13daec]/10 text-slate-600";

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f6f8f8] text-[#0f172a]"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
          <Link to="/" className="flex items-center gap-3 text-[#0f172a]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13daec] text-white shadow-[0_10px_22px_rgba(19,218,236,0.25)]">
              <School className="h-4 w-4" />
            </span>
            <span className="text-xl font-extrabold tracking-tight md:text-2xl">
              EduPlatform
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 md:inline">
              Already have an account?
            </span>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl border-2 border-[#13daec] px-5 text-sm font-bold text-[#08bfd4] transition hover:bg-[#13daec] hover:text-white"
            >
              Log In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8 md:py-10">
        <div className="w-full max-w-[31rem] rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6">
          <div className="mx-auto max-w-[22.5rem]">
            <div className="mb-6 text-center">
              <h1 className="whitespace-nowrap text-[1.7rem] font-extrabold tracking-tight text-[#14213d] sm:text-[1.9rem] md:text-[2.1rem]">
                Create your account
              </h1>
              <p className="mx-auto mt-2.5 max-w-sm text-sm leading-6 text-slate-500">
                Join our global community of curious learners and expert educators.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <p className="mb-3 text-xs font-semibold text-[#14213d]">I am a...</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("student")}
                    className={`flex min-h-[5.25rem] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition ${roleOptionClass("student")}`}
                    aria-pressed={role === "student"}
                  >
                    <User
                      className={`mb-1.5 h-6 w-6 ${role === "student" ? "text-[#13daec]" : "text-slate-400"}`}
                    />
                    <span className="text-base font-medium leading-none">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("teacher")}
                    className={`flex min-h-[5.25rem] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition ${roleOptionClass("teacher")}`}
                    aria-pressed={role === "teacher"}
                  >
                    <GraduationCap
                      className={`mb-1.5 h-6 w-6 ${role === "teacher" ? "text-[#13daec]" : "text-slate-400"}`}
                    />
                    <span className="text-base font-medium leading-none">Teacher</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-full-name"
                  className="mb-1.5 block text-xs font-semibold text-[#14213d]"
                >
                  Full Name
                </label>
                <div className="relative">
                  <SquareUserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-full-name"
                    type="text"
                    placeholder="John Doe"
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f4f7fb] pl-11 pr-4 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                    value={fullName}
                    onChange={handleFullNameChange}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="mb-1.5 block text-xs font-semibold text-[#14213d]"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-email"
                    type="email"
                    placeholder="john@example.com"
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f4f7fb] pl-11 pr-4 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                    value={email}
                    onChange={handleEmailChange}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="mb-1.5 block text-xs font-semibold text-[#14213d]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f4f7fb] pl-11 pr-11 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/15"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Minimum 6 characters.
                </p>
                {passwordError ? (
                  <p className="mt-2 text-xs text-rose-600">{passwordError}</p>
                ) : null}
              </div>

                {message ? (
                  <div
                  className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${feedbackClassName}`}
                  >
                    {message}
                  </div>
                ) : null}

              <div className="pt-1">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#13daec] px-6 text-base font-extrabold text-white shadow-[0_12px_24px_rgba(19,218,236,0.28)] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

    </div>
  );
}
