import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Card } from "../components/Card";
import { Sidebar } from "../components/Sidebar";
import { UserPanel } from "../components/UserPanel";
import { Button } from "../components/ui/button";

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-h-screen pl-16 md:pl-64">
        <div className="flex w-full flex-col">
          <Header />
          <div className="flex flex-1">
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Dashboard
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Placeholder view for the MVP dashboard.
                </p>
              </div>
              <div className="flex flex-col gap-8">
                <Card className="flex min-h-[200px] flex-col justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-200">
                      Weekly focus
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
                    <Button
                      variant="secondary"
                      className="bg-white text-slate-900 hover:bg-slate-100"
                    >
                      Explore pathways
                    </Button>
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    "Learning streak",
                    "Courses completed",
                    "Hours this week",
                  ].map((title) => (
                    <Card key={title}>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {title}
                      </p>
                      <p className="mt-3 text-sm text-slate-700">
                        Placeholder metric for the dashboard overview.
                      </p>
                    </Card>
                  ))}
                </div>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Continue learning
                    </h3>
                    <span className="text-xs text-slate-500">
                      Updated moments ago
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        title: "Designing learning paths",
                        description:
                          "Build a repeatable course framework in minutes.",
                      },
                      {
                        title: "Feedback loops",
                        description:
                          "Turn learner feedback into actionable insights.",
                      },
                      {
                        title: "Team onboarding",
                        description:
                          "Welcome new hires with clear learning goals.",
                      },
                    ].map((course) => (
                      <Card key={course.title} className="flex flex-col gap-4">
                        <div className="h-28 w-full rounded-xl bg-slate-100" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            {course.title}
                          </h4>
                          <p className="mt-2 text-sm text-slate-600">
                            {course.description}
                          </p>
                        </div>
                        <div>
                          <div className="h-2 w-full rounded-full bg-slate-200">
                            <div className="h-2 w-2/3 rounded-full bg-slate-900" />
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            66% complete
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            </main>
            <UserPanel />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
