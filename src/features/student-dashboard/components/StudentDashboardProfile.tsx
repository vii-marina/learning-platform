import {
  BookOpen,
  Camera,
  Mail,
  Pencil,
  RotateCcw,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Card } from "../../../components/ui/Card";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import type { CurrentUser, UpdateCurrentUserProfileInput } from "../../auth/types";
import { getStudentAvatarPublicUrl } from "../api/studentProfileStorage";

type StudentDashboardProfileProps = {
  student: CurrentUser;
  isSaving: boolean;
  onSave: (
    input: UpdateCurrentUserProfileInput,
    avatarFile: File | null
  ) => Promise<void>;
  saveMessage: {
    type: "error" | "success";
    text: string;
    details?: unknown;
  } | null;
  onClearSaveMessage: () => void;
};

type StudentProfileFormState = {
  email: string;
  fullName: string;
  educationPlace: string;
  birthDate: string;
  bio: string;
  avatarPath: string;
  linkedinUrl: string;
  githubUrl: string;
};

type FieldStatus = "neutral" | "valid" | "invalid";

type FlattenedErrorDetails = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

function getStudentDisplayName(student: CurrentUser) {
  return student.fullName?.trim() || student.email;
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toFormState(student: CurrentUser): StudentProfileFormState {
  return {
    email: student.email,
    fullName: student.fullName ?? "",
    educationPlace: student.educationPlace ?? "",
    birthDate: student.birthDate ?? "",
    bio: student.bio ?? "",
    avatarPath: student.avatarPath ?? "",
    linkedinUrl: student.linkedinUrl ?? "",
    githubUrl: student.githubUrl ?? "",
  };
}

function isImageFile(file: File) {
  if (file.type) {
    return file.type.startsWith("image/");
  }

  return /\.(avif|bmp|gif|jpeg|jpg|png|svg|webp)$/i.test(file.name);
}

function isValidDateValue(value: string) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidEmailValue(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrlValue(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getEmailStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return isValidEmailValue(value) ? "valid" : "invalid";
}

function getRequiredTextStatus(value: string): FieldStatus {
  return value.trim() ? "valid" : "neutral";
}

function getOptionalTextStatus(value: string): FieldStatus {
  return value.trim() ? "valid" : "neutral";
}

function getDateStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return isValidDateValue(value) ? "valid" : "invalid";
}

function getUrlStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return isValidUrlValue(value.trim()) ? "valid" : "invalid";
}

function getFieldFrameClasses(status: FieldStatus) {
  if (status === "valid") {
    return "border-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]";
  }

  if (status === "invalid") {
    return "border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]";
  }

  return "border-slate-200";
}

function getFieldIconClasses(status: FieldStatus) {
  if (status === "valid") {
    return "text-emerald-500";
  }

  if (status === "invalid") {
    return "text-rose-500";
  }

  return "text-slate-400";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getFlattenedErrorDetails(details: unknown): FlattenedErrorDetails {
  if (!isRecord(details)) {
    return {
      formErrors: [],
      fieldErrors: {},
    };
  }

  const formErrors = toErrorMessages(details.formErrors);
  const fieldErrors: Record<string, string[]> = {};

  if (isRecord(details.fieldErrors)) {
    for (const [key, value] of Object.entries(details.fieldErrors)) {
      const messages = toErrorMessages(value);

      if (messages.length > 0) {
        fieldErrors[key] = messages;
      }
    }
  }

  return {
    formErrors,
    fieldErrors,
  };
}

function joinLabels(labels: string[]) {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <label className="text-sm font-bold text-[#14213d]">{label}</label>
      <span
        className={`rounded-full px-2 py-0.5 text-[12px] font-bold tracking-[0.16em] ${
          required
            ? "bg-[#13daec]/10 text-[#08bfd4]"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {required ? "Required" : "Optional"}
      </span>
    </div>
  );
}

function FieldShell({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="space-y-1.5">{children}</div>;
}

function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  status,
  type = "text",
  icon: Icon = Pencil,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  status: FieldStatus;
  type?: "text" | "url" | "date" | "email";
  icon?: LucideIcon;
}) {
  return (
    <FieldShell>
      <FieldLabel label={label} required={required} />
      <div
        className={`relative rounded-[0.9rem] border bg-transparent transition focus-within:border-[#13daec] focus-within:ring-4 focus-within:ring-[#13daec]/12 ${getFieldFrameClasses(status)}`}
      >
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full bg-transparent px-3 pr-10 text-sm font-medium text-[#14213d] outline-none placeholder:text-slate-400"
        />
        <Icon
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${getFieldIconClasses(status)}`}
        />
      </div>
    </FieldShell>
  );
}

function TextAreaField({
  label,
  required,
  value,
  onChange,
  placeholder,
  status,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  status: FieldStatus;
}) {
  return (
    <FieldShell>
      <FieldLabel label={label} required={required} />
      <div
        className={`relative rounded-[0.9rem] border bg-transparent transition focus-within:border-[#13daec] focus-within:ring-4 focus-within:ring-[#13daec]/12 ${getFieldFrameClasses(status)}`}
      >
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-10 w-full resize-y bg-transparent px-3 py-2.5 pr-10 text-sm font-medium text-[#14213d] outline-none placeholder:text-slate-400"
        />
      </div>
    </FieldShell>
  );
}

export function StudentDashboardProfile({
  student,
  isSaving,
  onSave,
  saveMessage,
  onClearSaveMessage,
}: StudentDashboardProfileProps) {
  const [formState, setFormState] = useState<StudentProfileFormState>(() =>
    toFormState(student)
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => {
    setFormState(toFormState(student));
    setAvatarFile(null);
    setAvatarError("");
  }, [student]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [avatarFile]);

  const avatarImageUrl =
    avatarPreviewUrl ?? getStudentAvatarPublicUrl(formState.avatarPath);

  const emailStatus = getEmailStatus(formState.email);
  const fullNameStatus = getRequiredTextStatus(formState.fullName);
  const educationPlaceStatus = getOptionalTextStatus(formState.educationPlace);
  const birthDateStatus = getDateStatus(formState.birthDate);
  const bioStatus = getOptionalTextStatus(formState.bio);
  const linkedinStatus = getUrlStatus(formState.linkedinUrl);
  const githubStatus = getUrlStatus(formState.githubUrl);

  const normalizedInput: UpdateCurrentUserProfileInput = {
    email: formState.email.trim(),
    fullName: formState.fullName.trim(),
    educationPlace: normalizeOptionalText(formState.educationPlace),
    birthDate: formState.birthDate || null,
    bio: normalizeOptionalText(formState.bio),
    avatarPath: student.avatarPath ?? null,
    linkedinUrl: normalizeOptionalText(formState.linkedinUrl),
    githubUrl: normalizeOptionalText(formState.githubUrl),
  };

  const hasRequiredFields =
    emailStatus === "valid" &&
    fullNameStatus === "valid";
  const hasValidationErrors =
    emailStatus === "invalid" ||
    birthDateStatus === "invalid" ||
    linkedinStatus === "invalid" ||
    githubStatus === "invalid";

  const missingRequiredFields = [
    ...(emailStatus === "valid" ? [] : ["Email"]),
    ...(fullNameStatus === "valid" ? [] : ["Full name"]),
  ];

  const invalidFields = [
    ...(emailStatus === "invalid" ? ["Email"] : []),
    ...(birthDateStatus === "invalid" ? ["Birth date"] : []),
    ...(linkedinStatus === "invalid" ? ["LinkedIn URL"] : []),
    ...(githubStatus === "invalid" ? ["GitHub URL"] : []),
  ];

  const hasChanges =
    avatarFile !== null ||
    normalizedInput.email !== student.email ||
    normalizedInput.fullName !== (student.fullName?.trim() ?? "") ||
    normalizedInput.educationPlace !== (student.educationPlace ?? null) ||
    normalizedInput.birthDate !== (student.birthDate ?? null) ||
    normalizedInput.bio !== (student.bio ?? null) ||
    normalizedInput.linkedinUrl !== (student.linkedinUrl ?? null) ||
    normalizedInput.githubUrl !== (student.githubUrl ?? null);

  const saveMessageDetails = getFlattenedErrorDetails(saveMessage?.details);
  const saveMessageExtraLines = [
    ...saveMessageDetails.formErrors,
    ...Object.values(saveMessageDetails.fieldErrors).flat(),
  ].filter((message, index, messages) => {
    if (message === saveMessage?.text) {
      return false;
    }

    return messages.indexOf(message) === index;
  });

  function updateField<K extends keyof StudentProfileFormState>(
    key: K,
    value: StudentProfileFormState[K]
  ) {
    onClearSaveMessage();
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function resetDraft() {
    onClearSaveMessage();
    setFormState(toFormState(student));
    setAvatarFile(null);
    setAvatarError("");
  }

  return (
    <div className="mx-auto max-w-[64rem] space-y-4">
      <div className="space-y-1 px-1">
        <h1 className="text-[2rem] font-black tracking-tight text-[#14213d]">
          Profile Settings
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-500">
          Manage your public identity and student information for the learning
          platform.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[15.5rem_minmax(0,1fr)]">
        <Card className="p-4 shadow-none">
          <div className="flex flex-col items-center text-center">
            <AdminTeacherAvatar
              name={getStudentDisplayName(student)}
              imageUrl={avatarImageUrl}
              size="lg"
            />
            <h2 className="mt-4 text-[2rem] font-black tracking-tight text-[#14213d]">
              {formState.fullName.trim() || getStudentDisplayName(student)}
            </h2>
            <p className="mt-1 text-sm font-bold text-[#08bfd4]">
              {formState.educationPlace.trim() || "Student"}
            </p>

            <label className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[1rem] bg-[#13daec] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(19,218,236,0.2)] transition hover:bg-[#10c6d7]">
              <Camera className="h-4 w-4" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  onClearSaveMessage();
                  const nextFile = event.target.files?.[0] ?? null;

                  if (!nextFile) {
                    return;
                  }

                  if (!isImageFile(nextFile)) {
                    setAvatarError("Please choose an image file.");
                    event.target.value = "";
                    return;
                  }

                  setAvatarFile(nextFile);
                  setAvatarError("");
                  event.target.value = "";
                }}
              />
            </label>

            <p className="mt-3 text-center text-xs font-semibold text-slate-400">
              JPG, GIF or PNG.
            </p>

            {avatarFile ? (
              <p className="mt-2 break-all text-xs text-slate-500">
                {avatarFile.name}
              </p>
            ) : null}

            {avatarError ? (
              <p className="mt-2 text-sm font-medium text-rose-600">
                {avatarError}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-[#d8f5f7] bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 text-[#08bfd4]">
                <UserRound className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#14213d]">
                Personal Information
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField
                label="Email"
                required
                value={formState.email}
                onChange={(value) => updateField("email", value)}
                placeholder="Enter email address"
                type="email"
                status={emailStatus}
                icon={Mail}
              />

              <TextField
                label="Full name"
                required
                value={formState.fullName}
                onChange={(value) => updateField("fullName", value)}
                placeholder="Enter full name"
                status={fullNameStatus}
              />

              <TextField
                label="Education place"
                required={false}
                value={formState.educationPlace}
                onChange={(value) => updateField("educationPlace", value)}
                placeholder="University, school, or course"
                status={educationPlaceStatus}
              />

              <TextField
                label="Birth date"
                required={false}
                value={formState.birthDate}
                onChange={(value) => updateField("birthDate", value)}
                placeholder="Select birth date"
                type="date"
                status={birthDateStatus}
              />
            </div>
          </Card>

          <Card className="rounded-[1.5rem] border-[#d8f5f7] bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 text-[#08bfd4]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#14213d]">
                  Additional Information
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <TextAreaField
                label="Biography"
                required={false}
                value={formState.bio}
                onChange={(value) => updateField("bio", value)}
                placeholder="Write a short introduction or add more details if needed."
                status={bioStatus}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="LinkedIn URL"
                  required={false}
                  value={formState.linkedinUrl}
                  onChange={(value) => updateField("linkedinUrl", value)}
                  placeholder="https://www.linkedin.com/in/username"
                  type="url"
                  status={linkedinStatus}
                />

                <TextField
                  label="GitHub URL"
                  required={false}
                  value={formState.githubUrl}
                  onChange={(value) => updateField("githubUrl", value)}
                  placeholder="https://github.com/username"
                  type="url"
                  status={githubStatus}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-h-10 flex-1">
              {avatarError ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  Please choose a valid image file before saving.
                </div>
              ) : saveMessage?.type === "error" ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-semibold">{saveMessage.text}</p>
                  {saveMessageExtraLines.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {saveMessageExtraLines.map((line) => (
                        <li key={line} className="leading-5">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : hasValidationErrors ? (
                <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Fix the invalid fields before saving: {joinLabels(invalidFields)}.
                </div>
              ) : !hasRequiredFields ? (
                <div className="rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-800">
                  Complete the required fields before saving: {joinLabels(missingRequiredFields)}.
                </div>
              ) : saveMessage?.type === "success" ? (
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {saveMessage.text}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.95rem] px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-[#14213d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !hasChanges}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Discard changes</span>
              </button>

              <button
                type="button"
                onClick={() => void onSave(normalizedInput, avatarFile)}
                className="inline-flex h-10 items-center justify-center rounded-[0.95rem] bg-[#13daec] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(19,218,236,0.2)] transition hover:bg-[#10c6d7] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !hasRequiredFields || hasValidationErrors || !hasChanges}
              >
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
