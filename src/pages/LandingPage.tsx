import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Button } from "../components/ui/button";
import { Card } from "../components/Card";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold text-slate-900">
              Learning made simple for busy teams
            </h1>
            <p className="mt-4 text-slate-600">
              Launch a modern learning hub in minutes. Track progress, share
              knowledge, and celebrate wins.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/register">
                <Button>Create account</Button>
              </a>
              <a href="/login">
                <Button variant="secondary">Sign in</Button>
              </a>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Guided learning paths",
              "Team-ready reporting",
              "Fast onboarding",
            ].map((item) => (
              <Card key={item}>
                <h3 className="text-base font-semibold text-slate-900">
                  {item}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Placeholder copy for the MVP highlight.
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
