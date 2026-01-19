import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AuthLayout } from "../layouts/AuthLayout";
import { supabase } from "../lib/supabase";
import { PasswordField } from "../components/PasswordField";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info" | "success">(
    "info"
  );
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (password.length >= 6 && passwordError) {
      setPasswordError("");
    }
  }, [password, passwordError]);

  useEffect(() => {
    if (messageType === "success") {
      setMessage("");
      setMessageType("info");
    }
  }, [messageType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 6) {
      setPasswordError(
        "Your password is too short. Please use at least 6 characters."
      );
      setMessage("");
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const messageText = error.message.toLowerCase();
      const isAlreadyRegistered =
        messageText.includes("already") || messageText.includes("registered");
      if (isAlreadyRegistered) {
        setMessage("This email is already registered. Please sign in.");
        setMessageType("error");
        return;
      }
      setMessage("");
      return;
    }

    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setMessage("This email is already registered. Please sign in.");
      setMessageType("error");
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      setMessage("Please check your email to confirm your account.");
      setMessageType("info");
      setPassword("");
      return;
    }
    setMessage("");
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
            <Input type="text" placeholder="Alex Johnson" className="mt-1" />
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
          <Button type="submit" className="mt-1 w-full py-3 text-base">
            Create account
          </Button>
        </form>
        {message ? (
          <p className="mt-4 text-xs text-slate-500">{message}</p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-blue-600">
            Sign in
          </a>
        </p>
      </Card>
    </AuthLayout>
  );
}
