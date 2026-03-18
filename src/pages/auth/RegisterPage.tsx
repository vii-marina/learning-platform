import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { supabase } from "../../lib/supabase";
import { PasswordField } from "../../components/ui/PasswordField";
import { registerProfile } from "../../features/auth/api/authApi";
import { getErrorMessage } from "../../features/auth/api/backendClient";
import { clearPendingRegistration, savePendingRegistration } from "../../features/auth/lib/pendingRegistration";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";
import type { PublicRegistrationRole } from "../../features/auth/types";

const feedbackClassByType = {
  error: "text-rose-600",
  info: "text-slate-500",
  success: "text-emerald-600",
} as const;

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<PublicRegistrationRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your learning journey in minutes."
    >
      <Card className="p-8">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-600">
            Full name
            <Input
              type="text"
              placeholder="Alex Johnson"
              className="mt-1"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                if (messageType === "error") {
                  setMessage("");
                }
              }}
            />
          </label>
          <label className="text-sm text-slate-600">
            Join as
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as PublicRegistrationRole);
                if (messageType === "error") {
                  setMessage("");
                }
              }}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Work email
            <Input
              type="email"
              placeholder="you@company.com"
              className="mt-1"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (messageType === "error") {
                  setMessage("");
                }
              }}
            />
          </label>
          <PasswordField
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (messageType === "error") {
                setMessage("");
              }
            }}
            error={passwordError}
          />
          <Button
            type="submit"
            className="mt-1 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
        {message ? (
          <p className={`mt-4 text-xs ${feedbackClassByType[messageType]}`}>{message}</p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-blue-600">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
