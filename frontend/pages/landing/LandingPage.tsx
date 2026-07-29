import { Suspense, lazy } from "react";
import { LandingNavbar } from "./components/LandingNavbar";
import { LandingFooter } from "./components/LandingFooter";
import { Hero } from "./sections/Hero";
import { TeacherSection } from "./sections/TeacherSection";
import { StudentSection } from "./sections/StudentSection";
import { FinalCTA } from "./sections/FinalCTA";

const CourseDemoSection = lazy(() => import("./demo/CourseDemoSection"));

export function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-white text-[#1f1b4d]">
      <LandingNavbar />
      <main>
        <Hero />
        <Suspense
          fallback={
            <section
              id="course-preview"
              className="min-h-[40rem] border-b-2 border-[#1f1b4d] bg-[#f8f7ff]"
            />
          }
        >
          <CourseDemoSection />
        </Suspense>
        <TeacherSection />
        <StudentSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
