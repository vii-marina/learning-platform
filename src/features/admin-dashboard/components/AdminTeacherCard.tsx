import { BookOpen, CheckCircle2, FileText, Mail, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { AdminTeacher } from "../types";
import { AdminTeacherAvatar } from "./AdminTeacherAvatar";

type AdminTeacherCardProps = {
  teacher: AdminTeacher;
  onDeleteClick: (teacher: AdminTeacher) => void;
};

function getTeacherDisplayName(teacher: AdminTeacher) {
  return teacher.fullName?.trim() || teacher.email;
}

export function AdminTeacherCard({ teacher, onDeleteClick }: AdminTeacherCardProps) {
  const displayName = getTeacherDisplayName(teacher);

  return (
    <article className="group rounded-[1.5rem] border border-[#d8f5f7] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.1)]">
      <div className="flex flex-col items-center text-center">
        <AdminTeacherAvatar name={displayName} size="md" />
        <h3 className="mt-4 break-all text-[1.15rem] font-black tracking-tight text-[#14213d]">
          {displayName}
        </h3>
        
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <BookOpen className="h-4 w-4 text-[#08bfd4]" />
            <span>Courses</span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#14213d]">
            {teacher.courseCount}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Published</span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#14213d]">
            {teacher.publishedCourseCount}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FileText className="h-4 w-4 text-amber-500" />
            <span>Drafts</span>
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#14213d]">
            {teacher.draftCourseCount}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2.5 text-sm text-slate-600">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 shrink-0 text-[#08bfd4]" />
          <p className="truncate">{teacher.email}</p>
        </div>
        <p className="text-sm leading-6 text-slate-500">
          {teacher.assignedStudents.length > 0
            ? `${teacher.assignedStudents.length} assigned students`
            : "No assigned students found"}
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          to={`/admin/dashboard/teachers/${teacher.id}`}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white text-sm font-semibold text-[#14213d] transition hover:border-[#13daec] hover:bg-[#13daec]/6"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit</span>
        </Link>
        <button
          type="button"
          onClick={() => onDeleteClick(teacher)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[1rem] border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>
    </article>
  );
}
