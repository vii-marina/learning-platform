import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { PasswordField } from "../../components/ui/PasswordField";
import { supabase } from "../../lib/supabase";
import { getCurrentUser, syncPendingRegistrationForEmail } from "../../features/auth/api/authApi";
import { BackendApiError, getErrorMessage } from "../../features/auth/api/backendClient";
import { getDefaultRouteForRole } from "../../features/auth/lib/roleRouting";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        "Your password is too short. Please use at least 6 characters."
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
        const isInvalidCredentials = error.message.toLowerCase().includes("invalid login credentials");
        setMessage(isInvalidCredentials ? "Invalid email or password." : error.message);
        return;
      }

      const signedInEmail = data.user?.email ?? normalizedEmail;
      const currentUser =
        (await syncPendingRegistrationForEmail(signedInEmail)) ?? (await getCurrentUser());

      navigate(getDefaultRouteForRole(currentUser.role));
    } catch (error) {
      if (error instanceof BackendApiError && error.code === "PROFILE_NOT_FOUND") {
        setMessage(
          "Your account is authenticated, but the app profile is missing. Contact support if this persists."
        );
        return;
      }

      setMessage(getErrorMessage(error, "Unable to complete sign-in."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue learning with your team."
    >
      <Card className="p-8">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-600">
            Email
            <Input
              type="email"
              placeholder="you@company.com"
              className="mt-1"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (message) {
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
              if (message) {
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
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        {message ? <p className="mt-4 text-xs text-rose-600">{message}</p> : null}
        <p className="mt-4 text-xs text-slate-500">
          New here?{" "}
          <Link to="/register" className="font-medium text-blue-600">
            Create an account
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
