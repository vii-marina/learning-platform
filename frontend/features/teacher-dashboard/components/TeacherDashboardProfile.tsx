import { Briefcase, Camera, RotateCcw, UserRound } from "lucide-react";
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
  type FieldStatus,
} from "../../profile/profileFormFields";
import { TextAreaField, TextField } from "../../profile/ProfileFormControls";
import { getTeacherAvatarPublicUrl } from "../api/teacherProfileStorage";
import { GenderField } from "./TeacherProfileGenderField";
import {
  getExperienceStatus,
  getTeacherDisplayName,
  normalizeExperienceYears,
  toFormState,
  type TeacherProfileFormState,
} from "./teacherProfileFormState";

type TeacherDashboardProfileProps = {
  teacher: CurrentUser;
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
  const [prevTeacher, setPrevTeacher] = useState(teacher);

  // Reset the form when a different teacher is loaded.
  if (teacher !== prevTeacher) {
    setPrevTeacher(teacher);
    setFormState(toFormState(teacher));
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
    avatarPreviewUrl ?? getTeacherAvatarPublicUrl(formState.avatarPath);

  const emailStatus = getEmailStatus(formState.email);
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
    email: formState.email.trim(),
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
    emailStatus === "valid" &&
    fullNameStatus === "valid" &&
    educationStatus === "valid" &&
    genderStatus === "valid" &&
    birthDateStatus === "valid" &&
    headlineStatus === "valid";

  const hasValidationErrors =
    emailStatus === "invalid" ||
    birthDateStatus === "invalid" ||
    experienceStatus === "invalid" ||
    linkedinStatus === "invalid" ||
    githubStatus === "invalid";

  const missingRequiredFields = [
    ...(emailStatus === "valid" ? [] : ["Email"]),
    ...(fullNameStatus === "valid" ? [] : ["Повне імʼя"]),
    ...(educationStatus === "valid" ? [] : ["Освіта"]),
    ...(genderStatus === "valid" ? [] : ["Стать"]),
    ...(birthDateStatus === "valid" ? [] : ["Дата народження"]),
    ...(headlineStatus === "valid" ? [] : ["Професійний заголовок"]),
  ];

  const invalidFields = [
    ...(emailStatus === "invalid" ? ["Email"] : []),
    ...(birthDateStatus === "invalid" ? ["Дата народження"] : []),
    ...(experienceStatus === "invalid" ? ["Роки досвіду"] : []),
    ...(linkedinStatus === "invalid" ? ["LinkedIn URL"] : []),
    ...(githubStatus === "invalid" ? ["GitHub URL"] : []),
  ];

  const hasChanges =
    avatarFile !== null ||
    normalizedInput.email !== teacher.email ||
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
    <div className="mx-auto max-w-[72rem] space-y-6">
      <div className="space-y-2">
        
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Налаштування профілю
        </h1>
        <p className="text-sm text-slate-500">
          Оновіть профіль викладача, професійні дані та публічні посилання.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="h-fit border-[#c7eef3] bg-[#f7fdff] p-5 xl:sticky xl:top-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AdminTeacherAvatar
              name={getTeacherDisplayName(teacher)}
              imageUrl={avatarImageUrl}
              size="lg"
            />

            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                {formState.fullName.trim() || getTeacherDisplayName(teacher)}
              </h2>
              <p className="text-sm font-medium text-[#0891a4]">
                {formState.headline.trim() || "Профіль викладача"}
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
                label="Повне імʼя"
                required
                value={formState.fullName}
                onChange={(value) => updateField("fullName", value)}
                placeholder="Введіть повне імʼя"
                status={fullNameStatus}
              />
              <TextField
                label="Email"
                required
                value={formState.email}
                onChange={(value) => updateField("email", value)}
                placeholder="Введіть email"
                type="email"
                status={emailStatus}
              />

              <GenderField
                value={formState.gender}
                onChange={(value) => updateField("gender", value)}
              />

              <TextField
                label="Освіта"
                required
                value={formState.education}
                onChange={(value) => updateField("education", value)}
                placeholder="Введіть освіту або заклад"
                status={educationStatus}
              />

              <TextField
                label="Дата народження"
                required
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
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Професійна інформація
                </h2>
                <p className="text-sm text-slate-500">
                  Заголовок, біографія та посилання для профілю викладача.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <TextField
                label="Професійний заголовок"
                required
                value={formState.headline}
                onChange={(value) => updateField("headline", value)}
                placeholder="Python Developer, викладач веброзробки"
                status={headlineStatus}
              />

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
                  label="Спеціалізація"
                  required={false}
                  value={formState.specialization}
                  onChange={(value) => updateField("specialization", value)}
                  placeholder="Python, веброзробка, Data Science"
                  status={specializationStatus}
                />

                <TextField
                  label="Роки досвіду"
                  required={false}
                  value={formState.experienceYears}
                  onChange={(value) => updateField("experienceYears", value)}
                  placeholder="Введіть кількість років досвіду"
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
