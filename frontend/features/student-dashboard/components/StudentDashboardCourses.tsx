import { useState } from "react";
import { Card } from "../../../components/ui/Card";
import { LoadingState } from "../../../components/ui/LoadingState";
import type { StudentDashboardCourseCatalogItem } from "../api/studentDashboardApi";
import { StudentDashboardCourseQuickViewModal } from "./StudentDashboardCourseQuickViewModal";
import {
  buildStudentDashboardCatalogCards,
  type StudentDashboardCatalogCard,
} from "./studentDashboardViewModels";
import { StudentDashboardCourseCard } from "./StudentDashboardCourseCard";

type StudentDashboardCoursesProps = {
  courses: StudentDashboardCourseCatalogItem[];
  isLoadingCourses: boolean;
  coursesMessage: string | null;
  onContinueCourse: (courseId: string) => void;
};

export function StudentDashboardCourses({
  courses,
  isLoadingCourses,
  coursesMessage,
  onContinueCourse,
}: StudentDashboardCoursesProps) {
  const [selectedCourse, setSelectedCourse] =
    useState<StudentDashboardCatalogCard | null>(null);
  const catalogCards = buildStudentDashboardCatalogCards(courses);

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
            Мої курси
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Курси, на які ви записані, з прогресом уроків, тестів і вправ.
          </p>
        </section>

        {coursesMessage ? (
          <Card className="rounded-[1.5rem] border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-none">
            <p className="text-sm font-medium">{coursesMessage}</p>
          </Card>
        ) : null}

        {isLoadingCourses && courses.length === 0 ? (
          <LoadingState variant="section" />
        ) : catalogCards.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_50px_rgba(15,23,42,0.04)]">
            <h2 className="text-xl font-semibold text-slate-950">У розділі “Мої курси” поки немає курсів</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Курси зʼявляться тут після запису студента або додавання до курсу.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {catalogCards.map((course) => (
              <StudentDashboardCourseCard
                key={course.id}
                course={course}
                actionLabel="Продовжити"
                actionVariant="primary"
                showProgress
                onQuickView={setSelectedCourse}
                onAction={() => onContinueCourse(course.id)}
              />
            ))}
          </section>
        )}
      </div>

      <StudentDashboardCourseQuickViewModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onContinueCourse={onContinueCourse}
      />
    </>
  );
}
