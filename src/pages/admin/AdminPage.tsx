import { useState } from "react";
import { Footer } from "../../components/layout/Footer";
import { Header } from "../../components/layout/Header";
import { Sidebar } from "../../components/layout/Sidebar";
import { CourseBuilderPage } from "./CourseBuilderPage";

export function AdminPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
      <div
        className={`transition-[padding] duration-300 ${
          isSidebarOpen ? "pl-64" : "pl-16"
        }`}
      >
        <Header alignLeft />
        <main className="mx-auto flex w-full max-w-none flex-col gap-6 px-6 py-8">
          <CourseBuilderPage />
        </main>
        <Footer />
      </div>
    </div>
  );
}
