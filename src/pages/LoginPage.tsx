import { Card } from "../components/Card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AuthLayout } from "../layouts/AuthLayout";

export function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue learning with your team."
    >
      <Card>
        <form className="flex flex-col gap-4">
          <label className="text-sm text-slate-600">
            Email
            <Input type="email" placeholder="you@company.com" className="mt-1" />
          </label>
          <label className="text-sm text-slate-600">
            Password
            <Input type="password" placeholder="••••••••" className="mt-1" />
          </label>
          <Button type="button">Sign in</Button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          New here? <a href="/register">Create an account</a>
        </p>
      </Card>
    </AuthLayout>
  );
}
