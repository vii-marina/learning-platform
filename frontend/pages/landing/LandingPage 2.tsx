import { Suspense, lazy } from "react";
import { LandingNavbar } from "./components/LandingNavbar";
import { LandingFooter } from "./components/LandingFooter";
import { Hero } from "./sections/Hero";
import { AudienceCards } from "./sections/AudienceCards";
import { StudentFeatureGrid, TeacherFeatureGrid } from "./sections/FeatureGrid";
import { FAQ } from "./sections/FAQ";
import { FinalCTA } from "./sections/FinalCTA";

const CourseDemoSection = lazy(() => import("./demo/CourseDemoSection"));

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1f1b4d]">
      <LandingNavbar />
      <main>
        <Hero />
        <AudienceCards />
        <Suspense
          fallback={<section id="course-preview" className="min-h-[40rem] bg-[#f8f7ff]" />}
        >
          <CourseDemoSection />
        </Suspense>
        <TeacherFeatureGrid />
        <StudentFeatureGrid />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
