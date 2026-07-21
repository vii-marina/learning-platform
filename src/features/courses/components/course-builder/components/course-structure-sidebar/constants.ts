export const MODAL_SIDEBAR_WIDTH = 336;
export const PREVIEW_MODAL_SIDEBAR_WIDTH = 480;
export const RESIZABLE_SIDEBAR_MIN_WIDTH = 288;
export const RESIZABLE_SIDEBAR_MAX_WIDTH = 620;

export const moduleHeaderIconClassName = "bg-[#13daec]/12 text-[#08bfd4]";

export const lessonSidebarIconClassNames = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-emerald-50 text-emerald-600",
} as const;

export const testSidebarIconClassNames = {
  active: "bg-violet-100 text-violet-700",
  inactive: "bg-violet-50 text-violet-600",
} as const;

export type SidebarAccent = "default" | "lesson" | "test" | "exercise";

export type AccentClasses = {
  moduleActiveBorder: string;
  moduleIcon: string;
  itemActiveBorder: string;
  itemActiveBg: string;
  itemActiveDot: string;
  resizeRing: string;
};

export const accentClassNames: Record<SidebarAccent, AccentClasses> = {
  default: {
    moduleActiveBorder: "border-[#13daec]/30",
    moduleIcon: "bg-[#13daec]/12 text-[#08bfd4]",
    itemActiveBorder: "border-[#13daec]",
    itemActiveBg: "bg-[#13daec]/12",
    itemActiveDot: "bg-[#13daec]",
    resizeRing: "hover:border-[#13daec] focus-visible:ring-[#13daec]/50",
  },
  lesson: {
    moduleActiveBorder: "border-emerald-200",
    moduleIcon: "bg-emerald-50 text-emerald-600",
    itemActiveBorder: "border-emerald-300",
    itemActiveBg: "bg-emerald-50",
    itemActiveDot: "bg-emerald-500",
    resizeRing: "border border-emerald-300",
  },
  test: {
    moduleActiveBorder: "border-violet-200",
    moduleIcon: "bg-violet-50 text-violet-600",
    itemActiveBorder: "border-violet-300",
    itemActiveBg: "bg-violet-50",
    itemActiveDot: "bg-violet-500",
    resizeRing: "border border-violet-300",
  },
  exercise: {
    moduleActiveBorder: "border-orange-200",
    moduleIcon: "bg-orange-50 text-orange-500",
    itemActiveBorder: "border-orange-300",
    itemActiveBg: "bg-orange-50",
    itemActiveDot: "bg-orange-500",
    resizeRing: "border border-orange-300",
  },
};

export type PreviewAccentClasses = {
  rowActive: string;
  rowInactive: string;
  icon: string;
  chevron: string;
  editButton: string;
};

const cleanPreviewAccentClasses: PreviewAccentClasses = {
  rowActive: "border-emerald-200 bg-transparent text-[#14213d]",
  rowInactive:
    "border-transparent bg-transparent text-slate-500 hover:border-emerald-200 hover:text-[#14213d]",
  icon: "bg-transparent text-emerald-600",
  chevron: "text-emerald-300",
  editButton: "hover:bg-transparent hover:text-emerald-600",
};

const defaultPreviewAccentClasses: PreviewAccentClasses = {
  rowActive: "border-emerald-200 bg-emerald-50 text-[#14213d]",
  rowInactive:
    "border-transparent text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/70 hover:text-[#14213d]",
  icon: "bg-white text-emerald-600",
  chevron: "text-emerald-300",
  editButton: "hover:bg-white hover:text-emerald-600",
};

export const resolvePreviewAccentClasses = (isCleanAccent: boolean) =>
  isCleanAccent ? cleanPreviewAccentClasses : defaultPreviewAccentClasses;

export const getLessonRowKey = (moduleId: string, lessonId: string) =>
  `lesson:${moduleId}:${lessonId}`;

export const getTestRowKey = (moduleId: string, testId: string) =>
  `test:${moduleId}:${testId}`;

export const getExerciseRowKey = (moduleId: string, exerciseId: string) =>
  `exercise:${moduleId}:${exerciseId}`;

export const getDraftRowKey = (moduleId: string) => `draft:${moduleId}`;
