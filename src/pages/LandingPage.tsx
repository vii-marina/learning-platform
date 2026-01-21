import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Button } from "../components/ui/button";
import { Card } from "../components/Card";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header showAuthLinks />
      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
          <div className="flex flex-col gap-8">
            {/* <h1 className="text-4xl font-semibold text-slate-900">
              Learning made simple for busy teams
            </h1>
            <p className="mt-4 text-slate-600">
              Launch a modern learning hub in minutes. Track progress, share
              knowledge, and celebrate wins.
            </p> */}
            <Card className="flex min-h-[200px] flex-col justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-200">
                      Daily focus
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">
                      Sharpen your skills with EduCat
                    </h2>
                    <p className="mt-2 text-sm text-slate-200">
                      Build momentum with bite-sized lessons curated for your
                      team.
                    </p>
                  </div>
                  <div>
                  <div className="mt-6 flex gap-3">
                      <a href="/register">
                        <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-400">Create account</Button>
                      </a>
                      <a href="/login">
                        <Button variant="secondary" className="border border-slate-300 px-3 py-2  hover:bg-slate-400 text-white hover:text-slate-900">Sign in</Button>
                      </a>
                    </div>
                  </div>
                </Card>

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
