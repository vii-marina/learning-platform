import {
  Briefcase,
  Camera,
  Mars,
  Pencil,
  RotateCcw,
  UserRound,
  Venus,
  VenusAndMars,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Card } from "../../../components/ui/Card";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import type {
  CurrentUser,
  TeacherProfileGender,
  UpdateCurrentUserProfileInput,
} from "../../auth/types";
import { getTeacherAvatarPublicUrl } from "../api/teacherProfileStorage";

type TeacherDashboardProfileProps = {
  teacher: CurrentUser;
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

type TeacherProfileFormState = {
  fullName: string;
  headline: string;
  bio: string;
  specialization: string;
  experienceYears: string;
  education: string;
  gender: TeacherProfileGender | "";
  birthDate: string;
  avatarPath: string;
  linkedinUrl: string;
  githubUrl: string;
};

type FieldStatus = "neutral" | "valid" | "invalid";

type FlattenedErrorDetails = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

function getTeacherDisplayName(teacher: CurrentUser) {
  return teacher.fullName?.trim() || teacher.email;
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeExperienceYears(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function toFormState(teacher: CurrentUser): TeacherProfileFormState {
  return {
    fullName: teacher.fullName ?? "",
    headline: teacher.headline ?? "",
    bio: teacher.bio ?? "",
    specialization: teacher.specialization ?? "",
    experienceYears:
      teacher.experienceYears === null || teacher.experienceYears === undefined
        ? ""
        : String(teacher.experienceYears),
    education: teacher.education ?? "",
    gender: teacher.gender ?? "",
    birthDate: teacher.birthDate ?? "",
    avatarPath: teacher.avatarPath ?? "",
    linkedinUrl: teacher.linkedinUrl ?? "",
    githubUrl: teacher.githubUrl ?? "",
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

function isValidUrlValue(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function getExperienceStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return normalizeExperienceYears(value) !== null ? "valid" : "invalid";
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
        className={`rounded-full px-2 py-0.5 text-[12px]  tracking-[0.16em] ${
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
  min,
  icon: Icon = Pencil,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  status: FieldStatus;
  type?: "text" | "url" | "number" | "date";
  min?: number;
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
          min={min}
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

function GenderField({
  value,
  onChange,
}: {
  value: TeacherProfileGender | "";
  onChange: (value: TeacherProfileGender | "") => void;
}) {
  const options: Array<{
    value: TeacherProfileGender;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "male", label: "Male", icon: Mars },
    { value: "female", label: "Female", icon: Venus },
    { value: "other", label: "Other", icon: VenusAndMars },
  ];

  return (
    <FieldShell>
      <FieldLabel label="Gender" required />
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex h-10 items-center justify-center gap-2 rounded-[0.9rem] border text-sm font-semibold transition ${
                isActive
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
                  : "border-slate-200 bg-transparent text-slate-500 hover:border-[#13daec]/40 hover:text-[#14213d]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

export function TeacherDashboardProfile({
  teacher,
  isSaving,
  onSave,
  saveMessage,
  onClearSaveMessage,
}: TeacherDashboardProfileProps) {
  const [formState, setFormState] = useState<TeacherProfileFormState>(() =>
    toFormState(teacher)
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => {
    setFormState(toFormState(teacher));
    setAvatarFile(null);
    setAvatarError("");
  }, [teacher]);

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
    avatarPreviewUrl ?? getTeacherAvatarPublicUrl(formState.avatarPath);

  const fullNameStatus = getRequiredTextStatus(formState.fullName);
  const educationStatus = getRequiredTextStatus(formState.education);
  const birthDateStatus = getDateStatus(formState.birthDate);
  const headlineStatus = getRequiredTextStatus(formState.headline);
  const bioStatus = getOptionalTextStatus(formState.bio);
  const specializationStatus = getOptionalTextStatus(formState.specialization);
  const experienceStatus = getExperienceStatus(formState.experienceYears);
  const linkedinStatus = getUrlStatus(formState.linkedinUrl);
  const githubStatus = getUrlStatus(formState.githubUrl);
  const genderStatus: FieldStatus = formState.gender ? "valid" : "neutral";

  const normalizedInput: UpdateCurrentUserProfileInput = {
    fullName: formState.fullName.trim(),
    headline: formState.headline.trim(),
    bio: normalizeOptionalText(formState.bio),
    specialization: normalizeOptionalText(formState.specialization),
    experienceYears: normalizeExperienceYears(formState.experienceYears),
    education: formState.education.trim(),
    gender: formState.gender || null,
    birthDate: formState.birthDate || null,
    avatarPath: teacher.avatarPath ?? null,
    linkedinUrl: normalizeOptionalText(formState.linkedinUrl),
    githubUrl: normalizeOptionalText(formState.githubUrl),
  };

  const hasRequiredFields =
    fullNameStatus === "valid" &&
    educationStatus === "valid" &&
    genderStatus === "valid" &&
    birthDateStatus === "valid" &&
    headlineStatus === "valid";

  const hasValidationErrors =
    birthDateStatus === "invalid" ||
    experienceStatus === "invalid" ||
    linkedinStatus === "invalid" ||
    githubStatus === "invalid";

  const missingRequiredFields = [
    ...(fullNameStatus === "valid" ? [] : ["Full name"]),
    ...(educationStatus === "valid" ? [] : ["Education"]),
    ...(genderStatus === "valid" ? [] : ["Gender"]),
    ...(birthDateStatus === "valid" ? [] : ["Birth date"]),
    ...(headlineStatus === "valid" ? [] : ["Headline"]),
  ];

  const invalidFields = [
    ...(birthDateStatus === "invalid" ? ["Birth date"] : []),
    ...(experienceStatus === "invalid" ? ["Experience years"] : []),
    ...(linkedinStatus === "invalid" ? ["LinkedIn URL"] : []),
    ...(githubStatus === "invalid" ? ["GitHub URL"] : []),
  ];

  const hasChanges =
    avatarFile !== null ||
    normalizedInput.fullName !== (teacher.fullName?.trim() ?? "") ||
    normalizedInput.headline !== (teacher.headline?.trim() ?? "") ||
    normalizedInput.bio !== (teacher.bio ?? null) ||
    normalizedInput.specialization !== (teacher.specialization ?? null) ||
    normalizedInput.experienceYears !== (teacher.experienceYears ?? null) ||
    normalizedInput.education !== (teacher.education?.trim() ?? "") ||
    normalizedInput.gender !== (teacher.gender ?? null) ||
    normalizedInput.birthDate !== (teacher.birthDate ?? null) ||
    normalizedInput.linkedinUrl !== (teacher.linkedinUrl ?? null) ||
    normalizedInput.githubUrl !== (teacher.githubUrl ?? null);

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

  function updateField<K extends keyof TeacherProfileFormState>(
    key: K,
    value: TeacherProfileFormState[K]
  ) {
    onClearSaveMessage();
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function resetDraft() {
    onClearSaveMessage();
    setFormState(toFormState(teacher));
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
          Manage your public identity and professional information for the
          learning platform.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[15.5rem_minmax(0,1fr)]">
        <Card className=" p-4 shadow-none">
          <div className="flex flex-col items-center text-center">
            <AdminTeacherAvatar
              name={getTeacherDisplayName(teacher)}
              imageUrl={avatarImageUrl}
              size="lg"
            />
            <h2 className="mt-4 text-[2rem] font-black tracking-tight text-[#14213d]">
              {formState.fullName.trim() || getTeacherDisplayName(teacher)}
            </h2>
            <p className="mt-1 text-m font-bold   text-[#08bfd4]">
              {formState.headline.trim() || "Teacher"}
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
              <p className="mt-2 text-sm font-medium text-rose-600">{avatarError}</p>
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
                label="Full name"
                required
                value={formState.fullName}
                onChange={(value) => updateField("fullName", value)}
                placeholder="Enter full name"
                status={fullNameStatus}
              />

              <TextField
                label="Education"
                required
                value={formState.education}
                onChange={(value) => updateField("education", value)}
                placeholder="Enter education or institution"
                status={educationStatus}
              />

              <GenderField
                value={formState.gender}
                onChange={(value) => updateField("gender", value)}
              />

              <TextField
                label="Birth date"
                required
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
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#14213d]">
                  Professional Information
                </h2>
                
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <TextField
                label="Headline"
                required
                value={formState.headline}
                onChange={(value) => updateField("headline", value)}
                placeholder="Python Developer, Web Instructor"
                status={headlineStatus}
              />

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
                  label="Specialization"
                  required={false}
                  value={formState.specialization}
                  onChange={(value) => updateField("specialization", value)}
                  placeholder="Python, Web Development, Data Science"
                  status={specializationStatus}
                />

                <TextField
                  label="Experience years"
                  required={false}
                  value={formState.experienceYears}
                  onChange={(value) => updateField("experienceYears", value)}
                  placeholder="Enter years of experience"
                  type="number"
                  min={0}
                  status={experienceStatus}
                />

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
