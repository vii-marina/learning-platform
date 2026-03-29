import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { loadAdminCoursesData } from "../../features/admin-dashboard/api/adminDashboardApi";
import { AdminCourseCatalog } from "../../features/admin-dashboard/components/AdminCourseCatalog";
import { getAdminCourseAuthorName } from "../../features/admin-dashboard/lib/adminCoursePreview";
import type { AdminDashboardCourseSummary } from "../../features/admin-dashboard/types";
import { getErrorMessage } from "../../features/auth/api/backendClient";

function isPublishedCourse(course: AdminDashboardCourseSummary) {
  return course.status === "published" || course.is_published;
}

function isArchivedCourse(course: AdminDashboardCourseSummary) {
  return course.status === "archived";
}

export function AdminDashboardCoursesPage() {
  const location = useLocation();
  const [courses, setCourses] = useState<AdminDashboardCourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);

  useEffect(() => {
    let isMounted = true;

    async function hydrateCourses() {
      try {
        const nextCourses = await loadAdminCoursesData();

        if (!isMounted) {
          return;
        }

        setCourses(nextCourses);
        setMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(getErrorMessage(error, "Unable to load courses."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      const searchableText = [
        course.id,
        course.title,
        getAdminCourseAuthorName(course),
        course.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [courses, deferredSearchValue]);
  const publishedCourses = useMemo(
    () =>
      filteredCourses.filter((course) => isPublishedCourse(course) && !isArchivedCourse(course)),
    [filteredCourses]
  );
  const draftCourses = useMemo(
    () =>
      filteredCourses.filter((course) => !isPublishedCourse(course) && !isArchivedCourse(course)),
    [filteredCourses]
  );
  const archivedCourses = useMemo(
    () => filteredCourses.filter((course) => isArchivedCourse(course)),
    [filteredCourses]
  );

  useEffect(() => {
    if (isLoading || !location.hash) {
      return;
    }

    const targetId = location.hash.replace("#", "");
    const element = document.getElementById(targetId);

    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [archivedCourses.length, draftCourses.length, isLoading, location.hash, publishedCourses.length]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Course Management
          </h1>
          
        </div>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
          Total courses: {courses.length}
        </div>
      </div>

      {message ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-none">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search courses or instructors..."
          className="h-12 w-full rounded-[1.15rem] border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-[#14213d] outline-none transition focus:border-[#13daec] focus:ring-4 focus:ring-[#13daec]/12"
        />
      </div>

      {isLoading ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          Loading courses...
        </Card>
      ) : filteredCourses.length === 0 ? (
        <Card className="rounded-[1.75rem] border-cyan-100 p-10 text-sm text-slate-500 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          {deferredSearchValue.trim()
            ? "No courses match your search."
            : "No courses found."}
        </Card>
      ) : (
        <div className="space-y-5">
          {publishedCourses.length > 0 ? (
            <AdminCourseCatalog
              sectionId="published-courses"
              title="Published Courses"
              courses={publishedCourses}
              emptyMessage="No published courses found."
              tone="published"
            />
          ) : null}
          {draftCourses.length > 0 ? (
            <AdminCourseCatalog
              sectionId="draft-courses"
              title="Draft Courses"
              courses={draftCourses}
              emptyMessage="No draft courses found."
              tone="draft"
            />
          ) : null}
          {archivedCourses.length > 0 ? (
            <AdminCourseCatalog
              sectionId="archived-courses"
              title="Archived Courses"
              courses={archivedCourses}
              emptyMessage="No archived courses found."
              tone="archived"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
