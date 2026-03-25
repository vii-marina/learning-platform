import { Card } from "../../../components/ui/Card";
import type { AdminDashboardStudent } from "../types";
import { AdminTeacherAvatar } from "./AdminTeacherAvatar";

type AdminUserDirectoryProps = {
  title: string;
  students: AdminDashboardStudent[];
  emptyMessage: string;
};

function getStudentDisplayName(student: AdminDashboardStudent) {
  return student.fullName?.trim() || student.email;
}

function renderCourseList(courses: string[], emptyLabel: string) {
  if (courses.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {courses.map((course) => (
        <div
          key={course}
          className="rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
        >
          {course}
        </div>
      ))}
    </div>
  );
}

export function AdminUserDirectory({
  title,
  students,
  emptyMessage,
}: AdminUserDirectoryProps) {
  return (
    <Card className="rounded-[1.5rem] border-cyan-100 p-0 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
      </div>

      {students.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full table-fixed">
            <thead className="bg-slate-50/80 text-sm text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="w-[20rem] px-5 py-4 text-left font-medium">
                  Full Name
                </th>
                <th className="w-[18rem] px-5 py-4 text-left font-medium">
                  Email
                </th>
                <th className="w-[7rem] px-5 py-4 text-left font-medium">
                  Age
                </th>
                <th className="w-[22rem] px-5 py-4 text-left font-medium">
                  Enrolled Courses
                </th>
                <th className="w-[22rem] px-5 py-4 text-left font-medium">
                  Completed Courses
                </th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => {
                const displayName = getStudentDisplayName(student);

                return (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 transition hover:bg-cyan-50/40 last:border-b-0"
                  >
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <AdminTeacherAvatar
                          name={displayName}
                          imageUrl={student.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-slate-900">
                            {displayName}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <p className="break-all text-sm text-slate-600">{student.email}</p>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <p className="text-sm font-semibold text-slate-900">
                        {student.age ?? "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      {renderCourseList(
                        student.enrolledCourses,
                        "No enrolled courses yet"
                      )}
                    </td>

                    <td className="px-5 py-4 align-middle">
                      {renderCourseList(
                        student.completedCourses,
                        "No completed courses yet"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
