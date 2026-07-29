import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  SquareUserRound,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "../../components/ui";
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
      setMessage("Введіть повне імʼя.");
      setMessageType("error");
      return;
    }

    if (password.length < 6) {
      setPasswordError(
        "Пароль занадто короткий. Використайте щонайменше 6 символів."
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
        options: {
          emailRedirectTo: new URL(
            "/email-confirmed",
            window.location.origin
          ).toString(),
          data: {
            full_name: trimmedFullName,
            role,
          },
        },
      });

      if (error) {
        const messageText = error.message.toLowerCase();
        const isAlreadyRegistered =
          messageText.includes("already") || messageText.includes("registered");

        if (isAlreadyRegistered) {
          setMessage("Цей email уже зареєстрований. Увійдіть в акаунт.");
          setMessageType("error");
          return;
        }

        setMessage(getErrorMessage(error, "Не вдалося створити акаунт."));
        setMessageType("error");
        return;
      }

      const identities = data.user?.identities ?? [];

      if (!data.user) {
        setMessage("Зараз не вдалося створити акаунт. Спробуйте ще раз.");
        setMessageType("error");
        return;
      }

      if (data.user && identities.length === 0) {
        setMessage("Цей email уже зареєстрований. Увійдіть в акаунт.");
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
        "Акаунт створено. Підтвердьте email, якщо це потрібно, а потім увійдіть для завершення налаштування профілю."
      );
      setMessageType("info");
    } catch (error) {
      setMessage(
        getErrorMessage(error, "Акаунт створено, але не вдалося завершити налаштування профілю.")
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
      ? "border-[#5549f1] bg-[#5549f1]/10 text-[#0f172a] shadow-[0_10px_24px_rgba(85,73,241,0.14)]"
      : "border-slate-200 bg-white text-[#0f172a] hover:border-[#5549f1]/50 hover:bg-[#5549f1]/5";

  const feedbackClassName =
    messageType === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : messageType === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-[#5549f1]/30 bg-[#5549f1]/10 text-slate-600";

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f6f8f8] text-[#0f172a]"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
          <Link to="/" className="flex items-center gap-3 text-[#0f172a]">
            <BrandMark className="h-10 w-10" />
            <span className="text-xl font-extrabold tracking-tight md:text-2xl">
              EduCat
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 md:inline">
              Уже маєте акаунт?
            </span>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl border-2 border-[#5549f1] px-5 text-sm font-bold text-[#5549f1] transition hover:bg-[#5549f1] hover:text-white"
            >
              Увійти
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8 md:py-10">
        <div className="w-full max-w-[31rem] rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6">
          <div className="mx-auto max-w-[22.5rem]">
            <div className="mb-6 text-center">
              <h1 className="whitespace-nowrap text-[1.7rem] font-extrabold tracking-tight text-[#14213d] sm:text-[1.9rem] md:text-[2.1rem]">
                Створіть акаунт
              </h1>
              <p className="mx-auto mt-2.5 max-w-sm text-sm leading-6 text-slate-500">
                Долучайтеся до спільноти студентів і викладачів.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <p className="mb-3 text-xs font-semibold text-[#14213d]">Я...</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("student")}
                    className={`flex min-h-[5.25rem] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition ${roleOptionClass("student")}`}
                    aria-pressed={role === "student"}
                  >
                    <User
                      className={`mb-1.5 h-6 w-6 ${role === "student" ? "text-[#5549f1]" : "text-slate-400"}`}
                    />
                    <span className="text-base font-medium leading-none">Студент</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("teacher")}
                    className={`flex min-h-[5.25rem] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition ${roleOptionClass("teacher")}`}
                    aria-pressed={role === "teacher"}
                  >
                    <GraduationCap
                      className={`mb-1.5 h-6 w-6 ${role === "teacher" ? "text-[#5549f1]" : "text-slate-400"}`}
                    />
                    <span className="text-base font-medium leading-none">Викладач</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-full-name"
                  className="mb-1.5 block text-xs font-semibold text-[#14213d]"
                >
                  Повне імʼя
                </label>
                <div className="relative">
                  <SquareUserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-full-name"
                    type="text"
                    placeholder="Імʼя та прізвище"
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f4f7fb] pl-11 pr-4 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#5549f1] focus:ring-4 focus:ring-[#5549f1]/15"
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
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-email"
                    type="email"
                    placeholder="john@example.com"
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f4f7fb] pl-11 pr-4 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#5549f1] focus:ring-4 focus:ring-[#5549f1]/15"
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
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-transparent bg-[#f4f7fb] pl-11 pr-11 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#5549f1] focus:ring-4 focus:ring-[#5549f1]/15"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-600"
                    aria-label={showPassword ? "Приховати пароль" : "Показати пароль"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Мінімум 6 символів.
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
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#5549f1] px-6 text-base font-extrabold text-white shadow-[0_12px_24px_rgba(85,73,241,0.28)] transition hover:bg-[#473ed4] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Створення акаунта..." : "Створити акаунт"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

    </div>
  );
}
