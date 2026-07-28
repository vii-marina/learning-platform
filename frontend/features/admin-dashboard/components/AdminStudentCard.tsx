import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Mail,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { AdminDashboardStudent } from "../types";
import { AdminTeacherAvatar } from "./AdminTeacherAvatar";
import { getStudentAvatarPublicUrl } from "../../student-dashboard/api/studentProfileStorage";

type AdminStudentCardProps = {
  student: AdminDashboardStudent;
  onDeleteClick: (student: AdminDashboardStudent) => void;
};

function getStudentDisplayName(student: AdminDashboardStudent) {
  return student.fullName?.trim() || student.email;
}

export function AdminStudentCard({ student, onDeleteClick }: AdminStudentCardProps) {
  const displayName = getStudentDisplayName(student);
  const avatarImageUrl = student.avatarUrl || getStudentAvatarPublicUrl(student.avatarPath);
  const visibleCourses = student.enrolledCourseDetails.slice(0, 3);
  const remainingCourseCount = Math.max(0, student.enrolledCourseDetails.length - visibleCourses.length);
  const averageProgress =
    student.enrolledCourseDetails.length > 0
      ? Math.round(
          student.enrolledCourseDetails.reduce(
            (sum, course) => sum + course.progressPercent,
            0
          ) / student.enrolledCourseDetails.length
        )
      : 0;

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-[1.5rem] border border-[#d8f5f7] bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.1)]">
      <div className="bg-[linear-gradient(135deg,#f8feff_0%,#eefcff_62%,#f7f5ff_100%)] px-5 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <AdminTeacherAvatar name={displayName} imageUrl={avatarImageUrl} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[1.15rem] font-black tracking-tight text-[#14213d]">
              {displayName}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4 shrink-0 text-[#08bfd4]" />
              <p className="truncate">{student.email}</p>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
              {student.educationPlace?.trim() || "Місце навчання не додано"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-5 pt-5">
        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <BookOpen className="h-4 w-4 text-[#08bfd4]" />
            <span>Записано</span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#14213d]">
            {student.enrolledCourseDetails.length}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Завершено</span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#14213d]">
            {student.enrolledCourseDetails.filter((course) => course.finishedAt).length}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <GraduationCap className="h-4 w-4 text-amber-500" />
            <span>Прогрес</span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#14213d]">
            {averageProgress}%
          </p>
        </div>
      </div>

      <div className="mt-5 flex-1 px-5">
        <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[#14213d]">Записані курси</p>
            {student.age !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                <UserRound className="h-3.5 w-3.5" />
                {student.age} років
              </span>
            ) : null}
          </div>

          {visibleCourses.length > 0 ? (
            <div className="mt-3 space-y-2">
              {visibleCourses.map((course) => (
                <div key={course.progressId} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                      {course.title}
                    </p>
                    <span className="shrink-0 text-xs font-bold text-[#08bfd4]">
                      {course.progressPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#13daec]"
                      style={{ width: `${course.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
              {remainingCourseCount > 0 ? (
                <p className="text-xs font-semibold text-slate-500">
                  +{remainingCourseCount} курсів у профілі студента
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Студент ще не записаний на курси.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-3 px-5 pb-5">
        <Link
          to={`/admin/dashboard/students/${student.id}`}
          state={{ student }}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white text-sm font-semibold text-[#14213d] transition hover:border-[#13daec] hover:bg-[#13daec]/6"
        >
          <Pencil className="h-4 w-4" />
          <span>Редагувати</span>
        </Link>
        <button
          type="button"
          onClick={() => onDeleteClick(student)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[1rem] border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>Видалити</span>
        </button>
      </div>
    </article>
  );
}
