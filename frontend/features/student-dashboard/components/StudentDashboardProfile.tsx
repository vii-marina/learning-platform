import {
  BookOpen,
  Camera,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/Card";
import { AdminTeacherAvatar } from "../../admin-dashboard/components/AdminTeacherAvatar";
import type { CurrentUser, UpdateCurrentUserProfileInput } from "../../auth/types";
import {
  getDateStatus,
  getEmailStatus,
  getFlattenedErrorDetails,
  getNoticeClassName,
  getOptionalTextStatus,
  getRequiredTextStatus,
  getUrlStatus,
  isImageFile,
  joinLabels,
  normalizeOptionalText,
} from "../../profile/profileFormFields";
import { TextAreaField, TextField } from "../../profile/ProfileFormControls";
import { getStudentAvatarPublicUrl } from "../api/studentProfileStorage";

type StudentDashboardProfileProps = {
  student: CurrentUser;
  isSaving: boolean;
  onSave: (
    input: UpdateCurrentUserProfileInput,
    avatarFile: File | null
  ) => Promise<void>;
  saveMessage: {
    type: "error";
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


function getStudentDisplayName(student: CurrentUser) {
  return student.fullName?.trim() || student.email;
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
  const [prevStudent, setPrevStudent] = useState(student);

  // Reset the form when a different student is loaded.
  if (student !== prevStudent) {
    setPrevStudent(student);
    setFormState(toFormState(student));
    setAvatarFile(null);
    setAvatarError("");
  }

  useEffect(() => {
    if (!avatarFile) {
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(avatarFile);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- publish the object-URL preview (revoked on cleanup)
    setAvatarPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
      setAvatarPreviewUrl(null);
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
    ...(fullNameStatus === "valid" ? [] : ["Повне імʼя"]),
  ];

  const invalidFields = [
    ...(emailStatus === "invalid" ? ["Email"] : []),
    ...(birthDateStatus === "invalid" ? ["Дата народження"] : []),
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
    <div className="mx-auto max-w-[72rem] space-y-6">
      <div className="space-y-2">
        
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Налаштування профілю
        </h1>
        <p className="text-sm text-slate-500">
          Оновіть профіль студента, освіту та публічні посилання.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="h-fit border-[#c7eef3] bg-[#f7fdff] p-5 xl:sticky xl:top-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AdminTeacherAvatar
              name={getStudentDisplayName(student)}
              imageUrl={avatarImageUrl}
              size="lg"
            />

            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                {formState.fullName.trim() || getStudentDisplayName(student)}
              </h2>
              <p className="text-sm font-medium text-[#0891a4]">
                {formState.educationPlace.trim() || "Профіль студента"}
              </p>
            </div>

            <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#13daec]/30 bg-[#13daec]/10 px-4 text-sm font-medium text-[#0f172a] transition hover:border-[#13daec]/50 hover:bg-[#13daec]/14">
              <Camera className="h-4 w-4" />
              <span>Завантажити фото</span>
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
                    setAvatarError("Оберіть файл зображення.");
                    event.target.value = "";
                    return;
                  }

                  setAvatarFile(nextFile);
                  setAvatarError("");
                  event.target.value = "";
                }}
              />
            </label>

            <p className="text-xs text-slate-400">
              JPG, GIF або PNG.
            </p>

            {avatarFile ? (
              <p className="break-all text-xs text-slate-500">{avatarFile.name}</p>
            ) : null}

            {avatarError ? (
              <p className="text-sm font-medium text-rose-600">{avatarError}</p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="border-[#d6f5f8] bg-white p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#13daec]/12 p-2 text-[#0891a4]">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Особиста інформація
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField
                label="Email"
                required
                value={formState.email}
                onChange={(value) => updateField("email", value)}
                placeholder="Введіть email"
                type="email"
                status={emailStatus}
              />

              <TextField
                label="Повне імʼя"
                required
                value={formState.fullName}
                onChange={(value) => updateField("fullName", value)}
                placeholder="Введіть повне імʼя"
                status={fullNameStatus}
              />

              <TextField
                label="Місце навчання"
                required={false}
                value={formState.educationPlace}
                onChange={(value) => updateField("educationPlace", value)}
                placeholder="Університет, школа або курс"
                status={educationPlaceStatus}
              />

              <TextField
                label="Дата народження"
                required={false}
                value={formState.birthDate}
                onChange={(value) => updateField("birthDate", value)}
                placeholder="Оберіть дату народження"
                type="date"
                status={birthDateStatus}
              />
            </div>
          </Card>

          <Card className="border-[#d6f5f8] bg-white p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#13daec]/12 p-2 text-[#0891a4]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Додаткова інформація
                </h2>
                <p className="text-sm text-slate-500">
                  Навчальний контекст, біографія та соціальні посилання.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <TextAreaField
                label="Біографія"
                required={false}
                value={formState.bio}
                onChange={(value) => updateField("bio", value)}
                placeholder="Напишіть коротке представлення або додайте потрібні деталі."
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

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-h-10 flex-1">
              {avatarError ? (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${getNoticeClassName("error")}`}>
                  Перед збереженням оберіть коректний файл зображення.
                </div>
              ) : saveMessage?.type === "error" ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${getNoticeClassName("error")}`}>
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
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${getNoticeClassName("warning")}`}>
                  Виправте некоректні поля перед збереженням: {joinLabels(invalidFields)}.
                </div>
              ) : !hasRequiredFields ? (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${getNoticeClassName("info")}`}>
                  Заповніть обовʼязкові поля перед збереженням: {joinLabels(missingRequiredFields)}.
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={resetDraft}
                disabled={isSaving || !hasChanges}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Скасувати зміни</span>
              </Button>

              <Button
                type="button"
                onClick={() => void onSave(normalizedInput, avatarFile)}
                disabled={isSaving || !hasRequiredFields || hasValidationErrors || !hasChanges}
              >
                {isSaving ? "Збереження..." : "Зберегти профіль"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
