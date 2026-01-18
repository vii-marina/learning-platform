import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Card } from "../components/Card";

export function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Placeholder view for the MVP dashboard.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
            <p className="mt-2 text-sm text-slate-600">
              Placeholder progress insights.
            </p>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Next lesson</h2>
            <p className="mt-2 text-sm text-slate-600">
              Placeholder next-step content.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
