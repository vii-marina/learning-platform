import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, School } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getCurrentUser, syncPendingRegistrationForEmail } from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (password.length >= 6 && passwordError) {
      setPasswordError("");
    }
  }, [password, passwordError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      setPasswordError(
        "Пароль занадто короткий. Використайте щонайменше 6 символів."
      );
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const isInvalidCredentials = error.message
          .toLowerCase()
          .includes("invalid login credentials");

        setMessage(isInvalidCredentials ? "Неправильний email або пароль." : error.message);
        return;
      }

      const signedInEmail = data.user?.email ?? normalizedEmail;
      const currentUser =
        (await syncPendingRegistrationForEmail(signedInEmail)) ??
        (await getCurrentUser());

      navigate(getDefaultRouteForRole(currentUser.role));
    } catch (error) {
      if (error instanceof BackendApiError && error.code === "PROFILE_NOT_FOUND") {
        setMessage(
          "Акаунт авторизовано, але профіль у застосунку відсутній. Якщо проблема повторюється, зверніться до підтримки."
        );
        return;
      }

      setMessage(getErrorMessage(error, "Не вдалося завершити вхід."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (message) {
      setMessage("");
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (message) {
      setMessage("");
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f6f8f8] text-[#0f172a]"
      style={{ fontFamily: '"Lexend", sans-serif' }}
    >
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
          <Link to="/" className="flex items-center gap-3 text-[#0f172a]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5549f1] text-white shadow-[0_10px_22px_rgba(85,73,241,0.25)]">
              <School className="h-4 w-4" />
            </span>
            <span className="text-xl font-extrabold tracking-tight md:text-2xl">
              EduCat
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              to="/"
              className="text-sm font-semibold text-[#0f172a] transition hover:text-[#5549f1]"
            >
              Переглянути курси
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-[#5549f1] transition hover:text-[#473ed4]"
            >
              Долучитися
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-8 md:py-10">
        <div className="w-full max-w-[31rem] rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6">
          <div className="mx-auto max-w-[22.5rem]">
            <div className="mb-6 text-center">
              <h1 className="text-[1.7rem] font-extrabold tracking-tight text-[#14213d] sm:text-[1.9rem] md:text-[2.1rem]">
                Вітаємо знову
              </h1>
              <p className="mx-auto mt-2.5 max-w-sm text-sm leading-6 text-slate-500">
                Увійдіть, щоб продовжити навчання
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-semibold text-[#14213d]"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f4f7fb] pl-11 pr-4 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#5549f1] focus:ring-4 focus:ring-[#5549f1]/15"
                    value={email}
                    onChange={handleEmailChange}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-[#14213d]"
                  >
                    Пароль
                  </label>
                  <a
                    href="#"
                    onClick={(event) => event.preventDefault()}
                    className="text-xs font-semibold text-[#5549f1] transition hover:underline"
                  >
                    Забули пароль?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Введіть пароль"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#f4f7fb] pl-11 pr-11 text-base text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#5549f1] focus:ring-4 focus:ring-[#5549f1]/15"
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
                {passwordError ? (
                  <p className="mt-2 text-xs text-rose-600">{passwordError}</p>
                ) : null}
              </div>

              {message ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">
                  {message}
                </div>
              ) : null}

              <div className="pt-1">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#5549f1] px-6 text-base font-extrabold text-white shadow-[0_12px_24px_rgba(85,73,241,0.28)] transition hover:bg-[#473ed4] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Вхід..." : "Увійти"}
                </button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              Немає акаунта?{" "}
              <Link
                to="/register"
                className="font-bold text-[#5549f1] transition hover:underline"
              >
                Створити акаунт
              </Link>
            </p>
          </div>
        </div>
      </main>

    </div>
  );
}
