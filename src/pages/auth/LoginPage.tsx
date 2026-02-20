import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { PasswordField } from "../../components/ui/PasswordField";
import { supabase } from "../../lib/supabase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
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
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      navigate("/dashboard");
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
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            error={passwordError}
          />
          <Button type="submit" className="mt-1 w-full py-3 text-base">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          New here?{" "}
          <a href="/register" className="font-medium text-blue-600">
            Create an account
          </a>
        </p>
      </Card>
    </AuthLayout>
  );
}
