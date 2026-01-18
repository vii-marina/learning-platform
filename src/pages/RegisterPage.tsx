import { Card } from "../components/Card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AuthLayout } from "../layouts/AuthLayout";

export function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your learning journey in minutes."
    >
      <Card>
        <form className="flex flex-col gap-4">
          <label className="text-sm text-slate-600">
            Full name
            <Input type="text" placeholder="Alex Johnson" className="mt-1" />
          </label>
          <label className="text-sm text-slate-600">
            Work email
            <Input type="email" placeholder="you@company.com" className="mt-1" />
          </label>
          <label className="text-sm text-slate-600">
            Password
            <Input type="password" placeholder="Create a password" className="mt-1" />
          </label>
          <Button type="button">Create account</Button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </Card>
    </AuthLayout>
  );
}
